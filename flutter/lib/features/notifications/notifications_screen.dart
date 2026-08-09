import 'package:flutter/material.dart';

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F111A),
      appBar: AppBar(
        title: const Text("اعلان‌ها"),
        backgroundColor: const Color(0xFF1A1D2B),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: const [
          ListTile(
            leading: Icon(Icons.notifications_active, color: Color(0xFF3B82F6)),
            title: Text("ورود جدید به حساب کاربری",
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold)),
            subtitle: Text("ورود از دستگاه Chrome / Linux",
                style: TextStyle(color: Colors.white54, fontSize: 11)),
          ),
          Divider(color: Colors.white10),
          ListTile(
            leading: Icon(Icons.group_add),
            title: Text("افزوده شدن به گروه توسعه‌دهندگان",
                style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.bold)),
            subtitle: Text("توسط علی رضایی",
                style: TextStyle(color: Colors.white54, fontSize: 11)),
          ),
        ],
      ),
    );
  }
}
