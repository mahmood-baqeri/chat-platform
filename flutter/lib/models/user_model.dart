enum UserRole { user, admin, owner }

class UserModel {
  final String id;
  final String phone;
  final String displayName;
  final String username;
  final String avatarUrl;
  final String bio;
  final String status;
  final String lastSeen;
  final UserRole role;
  final bool isBanned;

  UserModel({
    required this.id,
    required this.phone,
    required this.displayName,
    required this.username,
    required this.avatarUrl,
    required this.bio,
    required this.status,
    required this.lastSeen,
    required this.role,
    required this.isBanned,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? '',
      phone: json['phone'] ?? '',
      displayName: json['displayName'] ?? '',
      username: json['username'] ?? '',
      avatarUrl: json['avatarUrl'] ?? '',
      bio: json['bio'] ?? '',
      status: json['status'] ?? 'offline',
      lastSeen: json['lastSeen'] ?? '',
      role: json['role'] == 'admin'
          ? UserRole.admin
          : json['role'] == 'owner'
              ? UserRole.owner
              : UserRole.user,
      isBanned: json['isBanned'] ?? false,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'phone': phone,
        'displayName': displayName,
        'username': username,
        'avatarUrl': avatarUrl,
        'bio': bio,
        'status': status,
        'lastSeen': lastSeen,
        'role': role.name,
        'isBanned': isBanned,
      };
}
