# Docker and Kubernetes Deployment Guide

## Scope

This guide covers deployment and verification for the notification service in this repository using:

- Docker Compose
- Kubernetes (Docker Desktop cluster)

Repository root used in examples:

E:\Study\6th SEM\healthCare-system-

## Prerequisites

- Docker Desktop running
- Docker Compose available
- kubectl installed
- Kubernetes enabled in Docker Desktop
- Current kubectl context set to docker-desktop

Quick checks:

- docker version
- docker compose version
- kubectl version --client
- kubectl config current-context
- kubectl get nodes

## 1. Docker Deployment

### 1.1 Optional credentials (email and SMS)

The docker-compose file reads these from shell environment variables:

- EMAIL_USER
- EMAIL_PASS
- TWILIO_SID
- TWILIO_AUTH
- TWILIO_PHONE

If you do not set them, the service still starts, but email/SMS delivery will fail and be logged.

PowerShell example:

- $env:EMAIL_USER = ""
- $env:EMAIL_PASS = ""
- $env:TWILIO_SID = ""
- $env:TWILIO_AUTH = ""
- $env:TWILIO_PHONE = ""

### 1.2 Start notification stack

From repository root:

- docker compose up -d --build mongo-notification notification-service

### 1.3 Verify containers

- docker compose ps --filter status=running
- docker compose logs --tail 120 notification-service

Expected:

- mongo-notification is healthy
- notification-service is up on port 5005

### 1.4 API checks

Health endpoint:

- Invoke-RestMethod -Method Get -Uri http://localhost:5005/health

Send test notification:

- Invoke-RestMethod -Method Post -Uri http://localhost:5005/api/notifications/send -ContentType application/json -Body '{"eventType":"APPOINTMENT_BOOKED","channels":["email","sms"],"recipients":[{"name":"Test User","email":"test@example.com","phone":"+94771234567"}],"data":{"doctorName":"Silva","date":"2026-04-20","time":"10:00 AM"}}'

Fetch logs:

- Invoke-RestMethod -Method Get -Uri http://localhost:5005/api/notifications/logs

## 2. Kubernetes Deployment

### 2.1 Ensure cluster is ready

- kubectl config use-context docker-desktop
- kubectl get nodes
- kubectl get pods -A

### 2.2 Build image used by deployment

From repository root:

- docker build -t notification-service:latest ./notification-service

### 2.3 Create MongoDB backend inside cluster

Notification manifests assume mongo-notification exists at:

mongodb://mongo-notification:27017/notification

Create it if missing:

- kubectl create deployment mongo-notification --image=mongo:7 -n default
- kubectl expose deployment mongo-notification --port=27017 --target-port=27017 --name=mongo-notification -n default

### 2.4 Set notification secrets

Important: placeholder Twilio SID values like your_twilio_account_sid_here can crash app startup. Use real values or empty strings.

Safe secret setup command:

- kubectl create secret generic notification-secrets -n default --from-literal=MONGO_URI="mongodb://mongo-notification:27017/notification" --from-literal=EMAIL_USER="" --from-literal=EMAIL_PASS="" --from-literal=TWILIO_SID="" --from-literal=TWILIO_AUTH="" --from-literal=TWILIO_PHONE="" --dry-run=client -o yaml | kubectl apply -f -

### 2.5 Apply manifests

- kubectl apply -k ./notification-service/k8s

### 2.6 Wait for rollout

- kubectl rollout status deployment/mongo-notification -n default --timeout=240s
- kubectl rollout status deployment/notification-service -n default --timeout=300s
- kubectl get pods -n default -l app=notification-service
- kubectl get svc -n default notification-service

Expected:

- notification-service deployment available 2/2
- pods in Running state

### 2.7 Port-forward and test APIs

In one terminal:

- kubectl port-forward service/notification-service -n default 5006:5005

In another terminal:

- Invoke-RestMethod -Method Get -Uri http://localhost:5006/health
- Invoke-RestMethod -Method Post -Uri http://localhost:5006/api/notifications/send -ContentType application/json -Body '{"eventType":"APPOINTMENT_BOOKED","channels":["email","sms"],"recipients":[{"name":"K8s User","email":"k8s@example.com","phone":"+94770000000"}],"data":{"doctorName":"Perera","date":"2026-04-21","time":"11:30 AM"}}'
- Invoke-RestMethod -Method Get -Uri http://localhost:5006/api/notifications/logs

## 3. Teardown

Docker:

- docker compose stop notification-service mongo-notification
- docker compose rm -f notification-service mongo-notification

Kubernetes:

- kubectl delete -k ./notification-service/k8s
- kubectl delete deployment mongo-notification -n default
- kubectl delete service mongo-notification -n default

## 4. Known Issue and Fix

If Docker Desktop fails with:

initializing backend: ... formatting settings-store.json: invalid character 'ï' looking for beginning of value

Cause:

- settings-store.json was saved with UTF-8 BOM

Fix:

- rewrite settings-store.json as UTF-8 without BOM, then restart Docker Desktop

After fixing:

- docker desktop stop
- docker desktop start
- docker desktop status
