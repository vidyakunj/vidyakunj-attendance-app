import 'dart:convert';
import 'package:http/http.dart' as http;

class SmsService {
  static const String apiUrl =
      "https://vidyakunj-sms-server.onrender.com/send-sms";

  static Future<bool> sendSms({
    required String mobile,
    required String studentName,
  }) async {
    final message =
        "Dear Parents, Your child, $studentName remained absent in school today. Vidyakunj School";

    try {
      final response = await http.post(
        Uri.parse(apiUrl),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "mobile": mobile,
          "message": message,
          "studentName": studentName
        }),
      );

      if (response.statusCode == 200) {
        print("SMS Response: ${response.body}");
        return true;
      } else {
        print("SMS Error: ${response.body}");
        return false;
      }
    } catch (e) {
      print("SMS Exception: $e");
      return false;
    }
  }
}

