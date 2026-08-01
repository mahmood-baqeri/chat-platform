class AttachmentModel {
  final String id;
  final String name;
  final String type; // image, video, audio, document, sticker
  final String url;
  final int size;
  final String mimeType;
  final int? duration;

  AttachmentModel({
    required this.id,
    required this.name,
    required this.type,
    required this.url,
    required this.size,
    required this.mimeType,
    this.duration,
  });

  factory AttachmentModel.fromJson(Map<String, dynamic> json) {
    return AttachmentModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? 'document',
      url: json['url'] ?? '',
      size: json['size'] ?? 0,
      mimeType: json['mimeType'] ?? '',
      duration: json['duration'],
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'url': url,
        'size': size,
        'mimeType': mimeType,
        'duration': duration,
      };
}

class ReactionModel {
  final String emoji;
  final int count;
  final List<String> users;

  ReactionModel({
    required this.emoji,
    required this.count,
    this.users = const [],
  });

  factory ReactionModel.fromJson(Map<String, dynamic> json) {
    return ReactionModel(
      emoji: json['emoji'] ?? '',
      count: json['count'] ?? 0,
      users: (json['users'] as List? ?? []).map((u) => u.toString()).toList(),
    );
  }
}

class SeenByModel {
  final String userId;
  final String userDisplayName;
  final String userAvatarUrl;
  final String seenAt;

  SeenByModel({
    required this.userId,
    required this.userDisplayName,
    required this.userAvatarUrl,
    required this.seenAt,
  });

  factory SeenByModel.fromJson(Map<String, dynamic> json) {
    return SeenByModel(
      userId: json['userId'] ?? '',
      userDisplayName: json['userDisplayName'] ?? '',
      userAvatarUrl: json['userAvatarUrl'] ?? '',
      seenAt: json['seenAt'] ?? '',
    );
  }
}

class MessageModel {
  final String id;
  final String chatId;
  final String senderId;
  final String content;
  final String type;
  final String status; // sent, delivered, seen
  final String createdAt;
  final bool isEdited;
  final bool isPinned;
  final bool isDeleted;
  final String? replyToMessageId;
  final MessageModel? replyToMessage;
  final Map<String, dynamic>? forwardedFrom;
  final List<AttachmentModel> attachments;
  final List<ReactionModel> reactions;
  final List<SeenByModel> seenBy;
  final List<String> mentions;

  MessageModel({
    required this.id,
    required this.chatId,
    required this.senderId,
    required this.content,
    required this.type,
    required this.status,
    required this.createdAt,
    required this.isEdited,
    required this.isPinned,
    this.isDeleted = false,
    this.replyToMessageId,
    this.replyToMessage,
    this.forwardedFrom,
    required this.attachments,
    required this.reactions,
    this.seenBy = const [],
    this.mentions = const [],
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) {
    return MessageModel(
      id: json['id'] ?? '',
      chatId: json['chatId'] ?? '',
      senderId: json['senderId'] ?? '',
      content: json['content'] ?? '',
      type: json['type'] ?? 'text',
      status: json['status'] ?? 'sent',
      createdAt: json['createdAt'] ?? '',
      isEdited: json['isEdited'] ?? false,
      isPinned: json['isPinned'] ?? false,
      isDeleted: json['isDeleted'] ?? false,
      replyToMessageId: json['replyToMessageId'],
      replyToMessage: json['replyToMessage'] != null
          ? MessageModel.fromJson(json['replyToMessage'])
          : null,
      forwardedFrom: json['forwardedFrom'] is Map<String, dynamic>
          ? json['forwardedFrom']
          : null,
      attachments: (json['attachments'] as List? ?? [])
          .map((a) => AttachmentModel.fromJson(a))
          .toList(),
      reactions: (json['reactions'] as List? ?? [])
          .map((r) => ReactionModel.fromJson(r))
          .toList(),
      seenBy: (json['seenBy'] as List? ?? [])
          .map((s) => SeenByModel.fromJson(s))
          .toList(),
      mentions: (json['mentions'] as List? ?? []).map((m) => m.toString()).toList(),
    );
  }
}
