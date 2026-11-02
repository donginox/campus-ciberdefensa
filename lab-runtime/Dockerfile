FROM python:3.13.18-slim-bookworm@sha256:281d39ff02e3b389401586134ff9e6572954687822a58055ec07a60ded4e0b7f
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 CAMPUS_LAB_MODE=soc CAMPUS_SEED=1
WORKDIR /app
COPY --chown=10001:10001 server.py proxy.py dashboard.html dashboard.js dashboard.css /app/
USER 10001:10001
EXPOSE 8080 8081
CMD ["python", "/app/server.py"]
