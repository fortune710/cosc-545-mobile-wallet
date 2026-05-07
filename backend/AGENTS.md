## Rules for Coding Agents
1. Always perform validations on data passed in every API endpoint both from request parameters and request body. Use Pydantic for validation.

2. Always include rate-limiting via throttling provided by the Django REST Framework and use IP-based rate-limiting.

3. Always include proper documentation for every API endpoint using the Swagger/OpenAPI specification.

4. For every downstream called made in API routes, include structured logs. Refer to the `logging-best-practices` agent skill on what to include in structured logs depending on the API context. Include structured logs for error cases especially.

5. For Django best practics, refer to the `django-patterns` agent skill.

6. **Audit Logging**: Every user and regular system action (authentication, wallet movements, recipient changes, etc.) MUST be logged using the audit logger.
   - **Utility**: Use the `log_event` function located in `backend/src/audit/logger.py`.
   - **Event Types**: Use the centralized action enums (constants) defined in `backend/src/audit/events.py`. Always add new event types to this file instead of using raw strings.