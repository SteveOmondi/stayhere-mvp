# IoT Biometric Door Lock Integration Blueprint

This document outlines the architectural plan for integrating biometric and IoT-enabled smart locks into the StayHere platform.

## 1. High-Level Architecture
The system uses a "Token Exchange" model where the user's primary identity (StayHere JWT) is used to authorize the generation of a temporary, hardware-specific credential.

### Components:
- **Mobile App**: The user interface for requesting access.
- **StayHere.DoorService**: A microservice dedicated to lock management and IoT Hub communication.
- **Azure IoT Hub**: The bridge between the cloud and the physical hardware.
- **Smart Lock (IoT Device)**: The hardware unit installed at the apartment.

## 2. The Access Workflow
1. **User Authentication**: User logs in and receives the `StayHere JWT`.
2. **Access Request**: App calls `POST /door/request-access` with the JWT.
3. **Authorization Check**:
   - `DoorService` verifies the JWT.
   - `DoorService` calls `BookingService` to confirm an active, paid booking for the target `ApartmentId`.
4. **Credential Generation**:
   - `DoorService` generates a 6-digit Time-based One-Time Password (TOTP) or a digital "Virtual Key".
   - This credential is valid only for the duration of the booking.
5. **IoT Handshake**:
   - `DoorService` sends the credential to **Azure IoT Hub** via a Cloud-to-Device (C2D) message.
   - The Smart Lock receives and stores the credential locally.
6. **Physical Entry**: The user enters the PIN on the keypad or uses their biometric (fingerprint) which is matched against the locally cached credential.

## 3. Security Standards
- **Lease Duration**: Credentials must automatically expire at the booking's `CheckOutTime`.
- **Audit Logging**: Every "Unlock" event must be pushed back to the cloud for the property owner to see (e.g., "Door unlocked by Customer at 14:05").
- **Offline Mode**: The lock should store the last valid credential locally to allow entry even if the building Wi-Fi is down.

## 4. Future Implementation Steps
1. Provision an **Azure IoT Hub** (Standard Tier).
2. Develop the `StayHere.DoorService` using the Azure IoT SDK.
3. Implement `BookingService` integration to automate PIN issuance upon "Digital Check-in".
4. Configure APIM to route IoT-related traffic through a dedicated high-priority endpoint.

---
*Status: Design/Draft*  
*Date: 2026-05-04*
