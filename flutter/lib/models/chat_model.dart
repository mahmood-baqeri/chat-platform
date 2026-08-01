class ChatMember {
  final String userId;
  final String role;
  final String joinedAt;
  final bool isMuted;

  ChatMember({
    required this.userId,
    required this.role,
    required this.joinedAt,
    required this.isMuted,
  });

  factory ChatMember.fromJson(Map<String, dynamic> json) {
    return ChatMember(
      userId: json['userId'] ?? '',
      role: json['role'] ?? 'member',
      joinedAt: json['joinedAt'] ?? '',
      isMuted: json['isMuted'] ?? false,
    );
  }
}

class ChatModel {
  final String id;
  final String type; // direct, group, channel
  final String title;
  final String avatarUrl;
  final String lastMessage;
  final String lastMessageTime;
  final int unreadCount;
  final bool isOnline;
  final bool isPrivate;
  final String description;
  final String username;
  final int memberCount;
  final List<ChatMember> members;

  ChatModel({
    required this.id,
    required this.type,
    required this.title,
    required this.avatarUrl,
    required this.lastMessage,
    required this.lastMessageTime,
    required this.unreadCount,
    required this.isOnline,
    required this.isPrivate,
    required this.description,
    required this.username,
    required this.memberCount,
    required this.members,
  });

  factory ChatModel.fromJson(Map<String, dynamic> json) {
    return ChatModel(
      id: json['id'] ?? '',
      type: json['type'] ?? 'direct',
      title: json['title'] ?? '',
      avatarUrl: json['avatarUrl'] ?? '',
      lastMessage: json['lastMessage'] ?? '',
      lastMessageTime: json['lastMessageTime'] ?? '',
      unreadCount: json['unreadCount'] ?? 0,
      isOnline: json['isOnline'] ?? false,
      isPrivate: json['isPrivate'] ?? false,
      description: json['description'] ?? '',
      username: json['username'] ?? '',
      memberCount: json['memberCount'] ?? 1,
      members: (json['members'] as List? ?? [])
          .map((m) => ChatMember.fromJson(m))
          .toList(),
    );
  }
}
