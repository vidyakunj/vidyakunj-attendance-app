VIDYAKUNJ School Navsari — Final Package

Files included:
- Full Flutter app (pubspec.yaml, lib/, assets/)
- node_server/ (Node.js backend configured to use Gupshup)
- codemagic.yaml (build workflow)
- students_template.csv (with admin_user rows for default teacher accounts)

IMPORTANT:
- The node_server in this package contains embedded Gupshup credentials and a MASTER_API_KEY.
  For security, you may change them before deploying in production.

How to deploy:
1) Upload all files from this ZIP into your GitHub repo root (commit directly to main).
2) In Codemagic, ensure codemagic.yaml is detected and then start a build (main branch).
3) Deploy the node_server to a VPS and set MASTER_API_KEY to 'VKS@2025' if you leave defaults.

Default teacher accounts (pre-created):
- classA / classA123
- classB / classB123
- classC / classC123
- classD / classD123

After installing the APK on the teacher's phone:
1) Login as classA (or other).
2) Upload students_template.csv via Upload CSV/XLSX in the app. This will populate students and create admin users per CSV rows.
3) Mark attendance and tap Submit Attendance. SMS will be sent via Gupshup.
