FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_PATIENT_API=/api/patients
ARG VITE_APPOINTMENT_API=/api/appointments
ARG VITE_PAYMENT_API=/api/payments
ARG VITE_DOCTOR_API=/api/doctors
ARG VITE_TELEMEDICINE_API=/api/telemedicine

ENV VITE_PATIENT_API=${VITE_PATIENT_API}
ENV VITE_APPOINTMENT_API=${VITE_APPOINTMENT_API}
ENV VITE_PAYMENT_API=${VITE_PAYMENT_API}
ENV VITE_DOCTOR_API=${VITE_DOCTOR_API}
ENV VITE_TELEMEDICINE_API=${VITE_TELEMEDICINE_API}

RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
