ARG WAZUH_VERSION=4.14.5
FROM wazuh/wazuh-agent:${WAZUH_VERSION}

USER root

RUN set -eux; \
    if command -v apt-get >/dev/null 2>&1; then \
      apt-get update; \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 python3-pip procps net-tools; \
      rm -rf /var/lib/apt/lists/*; \
    elif command -v yum >/dev/null 2>&1; then \
      yum install -y python3 python3-pip procps-ng net-tools; \
      yum clean all; \
    elif command -v apk >/dev/null 2>&1; then \
      apk add --no-cache python3 py3-pip procps net-tools; \
    else \
      echo "Unsupported package manager for wazuh agent image"; \
      exit 1; \
    fi; \
    pip3 install --no-cache-dir docker==7.1.0
