#!/bin/bash
mkdir -p /home/app/QR/backend/certs
openssl req -x509 -newkey rsa:2048 \
  -keyout /home/app/QR/backend/certs/key.pem \
  -out /home/app/QR/backend/certs/cert.pem \
  -days 3650 -nodes \
  -subj '/CN=202.4.116.106' \
  -addext 'subjectAltName=IP:202.4.116.106,IP:192.168.10.195'
echo "SSL cert generated"
