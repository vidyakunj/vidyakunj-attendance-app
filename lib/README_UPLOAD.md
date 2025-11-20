VIDYAKUNJ Attendance App - Upload & Build Instructions

1) Upload this repository root to GitHub (all files and folders in this ZIP belong at the repository root). Do not nest under a subfolder.

2) In Codemagic project settings, set these environment variables (mark as Secure):
   MASTER_API_KEY = <pick-strong-secret>
   GUPSHUP_USERID = <your-gupshup-userid>
   GUPSHUP_PASSWORD = <your-gupshup-password>
   SERVER_URL = https://<your-server-domain>  # e.g. https://sms.vidyakunj.example

3) Deploy node_server to a VPS and set environment variables there as well.

4) Start Codemagic build (main branch, android-workflow). After success, download APK from Artifacts.

NOTE: For security DO NOT commit real passwords to GitHub. Use Codemagic secure env vars and server env vars.
