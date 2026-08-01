import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/theme/theme_bloc.dart';
import '../../bloc/auth/auth_bloc.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("تنظیمات برنامه"),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          BlocBuilder<ThemeBloc, ThemeState>(
            builder: (context, themeState) {
              return SwitchListTile(
                value: themeState.isDark,
                onChanged: (v) {
                  BlocProvider.of<ThemeBloc>(context).add(ToggleThemeEvent(v));
                },
                title: const Text("حالت تاریک (Dark Mode)", style: TextStyle(fontSize: 14)),
                activeColor: Theme.of(context).colorScheme.primary,
              );
            },
          ),
          SwitchListTile(
            value: true,
            onChanged: (v) {},
            title: const Text("اعلان‌ها و صداها (Notifications)", style: TextStyle(fontSize: 14)),
            activeColor: Theme.of(context).colorScheme.primary,
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.security),
            title: const Text("حریم خصوصی و امنیت", style: TextStyle(fontSize: 14)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.storage),
            title: const Text("داده‌ها و حافظه", style: TextStyle(fontSize: 14)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () {},
          ),
          ListTile(
            leading: const Icon(Icons.language),
            title: const Text("زبان برنامه (فارسی)", style: TextStyle(fontSize: 14)),
            trailing: const Icon(Icons.arrow_forward_ios, size: 14),
            onTap: () {},
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text("خروج از حساب کاربری", style: TextStyle(color: Colors.red, fontSize: 14)),
            onTap: () {
              BlocProvider.of<AuthBloc>(context).add(LogoutEvent());
              Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
            },
          ),
        ],
      ),
    );
  }
}
