import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/auth/auth_bloc.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({Key? key}) : super(key: key);

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _bioController = TextEditingController();

  void _showEditProfileModal(BuildContext context, String currentName, String currentUsername, String currentBio, String userId) {
    _nameController.text = currentName;
    _usernameController.text = currentUsername;
    _bioController.text = currentBio;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: EdgeInsets.only(
            bottom: MediaQuery.of(context).viewInsets.bottom,
            left: 20,
            right: 20,
            top: 20,
          ),
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text("ویرایش پروفایل", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 16),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: "نام و نام خانوادگی", border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _usernameController,
                  decoration: const InputDecoration(labelText: "نام کاربری (آیدی)", prefixText: "@", border: OutlineInputBorder()),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _bioController,
                  maxLines: 2,
                  decoration: const InputDecoration(labelText: "بیوگرافی", border: OutlineInputBorder()),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary,
                    ),
                    onPressed: () {
                      BlocProvider.of<AuthBloc>(context).add(
                        UpdateProfileEvent(
                          userId: userId,
                          displayName: _nameController.text.trim(),
                          username: _usernameController.text.trim(),
                          bio: _bioController.text.trim(),
                        ),
                      );
                      Navigator.pop(context);
                    },
                    child: const Text("ذخیره تغییرات", style: TextStyle(color: Colors.white, fontSize: 16)),
                  ),
                ),
                const SizedBox(height: 20),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("پروفایل کاربری"),
        actions: [
          BlocBuilder<AuthBloc, AuthState>(
            builder: (context, state) {
              if (state is AuthenticatedState) {
                return IconButton(
                  icon: const Icon(Icons.edit),
                  onPressed: () {
                    _showEditProfileModal(
                      context,
                      state.user.displayName,
                      state.user.username,
                      state.user.bio,
                      state.user.id,
                    );
                  },
                );
              }
              return const SizedBox.shrink();
            },
          ),
        ],
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          final user = state is AuthenticatedState ? state.user : null;
          final displayName = user?.displayName.isNotEmpty == true ? user!.displayName : "کاربر مهمان";
          final username = user?.username.isNotEmpty == true ? "@${user!.username}" : "@user";
          final phone = user?.phone.isNotEmpty == true ? user!.phone : "09123456789";
          final bio = user?.bio.isNotEmpty == true ? user!.bio : "تنظیم نشده است";
          final avatarUrl = user?.avatarUrl.isNotEmpty == true
              ? user!.avatarUrl
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200';

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 50,
                  backgroundImage: NetworkImage(avatarUrl),
                ),
                const SizedBox(height: 12),
                Text(
                  displayName,
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                ),
                Text(
                  username,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
                const SizedBox(height: 24),
                Card(
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        ListTile(
                          leading: Icon(Icons.phone, color: Theme.of(context).colorScheme.primary),
                          title: const Text("شماره همراه", style: TextStyle(color: Colors.grey, fontSize: 12)),
                          subtitle: Text(phone, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                        ),
                        const Divider(),
                        ListTile(
                          leading: Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
                          title: const Text("بیوگرافی", style: TextStyle(color: Colors.grey, fontSize: 12)),
                          subtitle: Text(bio, style: const TextStyle(fontSize: 14)),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
