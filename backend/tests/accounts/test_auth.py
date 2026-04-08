from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


User = get_user_model()


class AuthenticationTests(APITestCase):
    def test_register_returns_generic_message_and_creates_user(self):
        response = self.client.post(
            reverse("auth-register"),
            {
                "email": "user@example.com",
                "password": "VeryStrongPassword123!",
                "first_name": "Wallet",
                "last_name": "User",
                "display_name": "Wallet User",
                "phone_number": "+15555550123",
                "address_line_1": "123 Main St",
                "city": "Buffalo",
                "state": "NY",
                "postal_code": "14201",
                "country": "US",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(User.objects.filter(email="user@example.com").exists())
        self.assertIn("detail", response.data)
        user = User.objects.get(email="user@example.com")
        self.assertEqual(user.first_name, "Wallet")
        self.assertEqual(user.last_name, "User")
        self.assertEqual(user.city, "Buffalo")

    def test_login_me_and_logout_flow(self):
        user = User.objects.create_user(
            email="auth@example.com",
            password="VeryStrongPassword123!",
            first_name="Auth",
            last_name="User",
            display_name="Auth User",
            address_line_1="5 Elm St",
            city="Rochester",
            state="NY",
            postal_code="14604",
            country="US",
        )

        login_response = self.client.post(
            reverse("auth-login"),
            {
                "email": user.email,
                "password": "VeryStrongPassword123!",
            },
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)
        self.assertEqual(login_response.data["user"]["email"], user.email)
        self.assertEqual(login_response.data["user"]["first_name"], "Auth")
        self.assertEqual(login_response.data["user"]["last_name"], "User")

        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {login_response.data['access']}"
        )
        me_response = self.client.get(reverse("auth-me"))
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], user.email)
        self.assertEqual(me_response.data["city"], "Rochester")
        self.assertEqual(me_response.data["country"], "US")

        logout_response = self.client.post(
            reverse("auth-logout"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(logout_response.status_code, status.HTTP_205_RESET_CONTENT)

        refresh_response = self.client.post(
            reverse("auth-refresh"),
            {"refresh": login_response.data["refresh"]},
            format="json",
        )
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)
