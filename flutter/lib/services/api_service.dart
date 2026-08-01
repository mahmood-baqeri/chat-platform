import 'dart:convert';
import 'package:http/http.dart' as http;
import '../core/utils/constants.dart';
import '../models/user_model.dart';
import '../models/chat_model.dart';
import '../models/message_model.dart';

class ApiService {
  final String baseUrl;

  ApiService({this.baseUrl = AppConstants.apiBaseUrl});

  Future<Map<String, dynamic>> sendOtp(String phone) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/otp/send'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone}),
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String code) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/otp/verify'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'code': code}),
    );
    return jsonDecode(response.body);
  }

  Future<Map<String, dynamic>> getCurrentUser(String token) async {
    final response = await http.get(
      Uri.parse('$baseUrl/auth/me'),
      headers: {'Authorization': 'Bearer $token'},
    );
    return jsonDecode(response.body);
  }

  Future<UserModel> updateProfile({
    required String userId,
    String? firstName,
    String? lastName,
    String? displayName,
    String? username,
    String? bio,
    String? avatarUrl,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/profile/update'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'userId': userId,
        if (firstName != null) 'firstName': firstName,
        if (lastName != null) 'lastName': lastName,
        if (displayName != null) 'displayName': displayName,
        if (username != null) 'username': username,
        if (bio != null) 'bio': bio,
        if (avatarUrl != null) 'avatarUrl': avatarUrl,
      }),
    );
    final data = jsonDecode(response.body);
    return UserModel.fromJson(data['user']);
  }

  Future<List<ChatModel>> getChats({String? userId}) async {
    final uri = Uri.parse('$baseUrl/chats').replace(
      queryParameters: userId != null ? {'userId': userId} : null,
    );
    final response = await http.get(uri);
    final List list = jsonDecode(response.body);
    return list.map((c) => ChatModel.fromJson(c)).toList();
  }

  Future<ChatModel> createChat({
    required String type,
    required String title,
    String? description,
    String? avatarUrl,
    String? username,
    bool isPrivate = false,
    String? ownerId,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chats'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'type': type,
        'title': title,
        'description': description ?? '',
        'avatarUrl': avatarUrl,
        'username': username,
        'isPrivate': isPrivate,
        'ownerId': ownerId ?? 'user-1',
      }),
    );
    return ChatModel.fromJson(jsonDecode(response.body));
  }

  Future<Map<String, dynamic>> getMessages(String chatId, {int limit = 20, String? beforeId}) async {
    final queryParams = <String, String>{
      'limit': limit.toString(),
      if (beforeId != null && beforeId.isNotEmpty) 'beforeId': beforeId,
    };
    final uri = Uri.parse('$baseUrl/chats/$chatId/messages').replace(queryParameters: queryParams);
    final response = await http.get(uri);
    final data = jsonDecode(response.body);
    final List list = data['messages'] ?? [];
    final messages = list.map((m) => MessageModel.fromJson(m)).toList();
    return {
      'messages': messages,
      'hasMore': data['hasMore'] ?? false,
      'total': data['total'] ?? 0,
    };
  }

  Future<List<MessageModel>> searchMessages(String chatId, {String q = '', String? type, String? senderId}) async {
    final queryParams = <String, String>{
      if (q.isNotEmpty) 'q': q,
      if (type != null) 'type': type,
      if (senderId != null) 'senderId': senderId,
    };
    final uri = Uri.parse('$baseUrl/chats/$chatId/search').replace(queryParameters: queryParams);
    final response = await http.get(uri);
    final List list = jsonDecode(response.body);
    return list.map((m) => MessageModel.fromJson(m)).toList();
  }

  Future<MessageModel> sendMessage(
    String chatId,
    String content, {
    String senderId = 'user-1',
    String type = 'text',
    List<AttachmentModel>? attachments,
    String? replyToMessageId,
    MessageModel? replyToMessage,
    Map<String, dynamic>? forwardedFrom,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/chats/$chatId/messages'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'senderId': senderId,
        'content': content,
        'type': type,
        'attachments': attachments?.map((a) => a.toJson()).toList(),
        if (replyToMessageId != null) 'replyToMessageId': replyToMessageId,
        if (replyToMessage != null) 'replyToMessage': {
          'id': replyToMessage.id,
          'senderId': replyToMessage.senderId,
          'content': replyToMessage.content,
          'type': replyToMessage.type,
        },
        if (forwardedFrom != null) 'forwardedFrom': forwardedFrom,
      }),
    );
    return MessageModel.fromJson(jsonDecode(response.body));
  }

  Future<MessageModel> editMessage(String messageId, String content) async {
    final response = await http.put(
      Uri.parse('$baseUrl/messages/$messageId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'content': content}),
    );
    return MessageModel.fromJson(jsonDecode(response.body));
  }

  Future<void> deleteMessage(String messageId) async {
    await http.delete(Uri.parse('$baseUrl/messages/$messageId'));
  }

  Future<MessageModel> toggleReaction(String messageId, String emoji, String userId) async {
    final response = await http.post(
      Uri.parse('$baseUrl/messages/$messageId/reaction'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'emoji': emoji, 'userId': userId}),
    );
    return MessageModel.fromJson(jsonDecode(response.body));
  }

  Future<MessageModel> togglePin(String messageId) async {
    final response = await http.post(Uri.parse('$baseUrl/messages/$messageId/pin'));
    return MessageModel.fromJson(jsonDecode(response.body));
  }

  Future<void> markChatAsRead(String chatId, String userId) async {
    await http.post(
      Uri.parse('$baseUrl/chats/$chatId/read'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'userId': userId}),
    );
  }

  Future<AttachmentModel> uploadFile(String fileName, String mimeType, String dataUrl, int size) async {
    final response = await http.post(
      Uri.parse('$baseUrl/upload'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'fileName': fileName,
        'fileType': mimeType,
        'dataUrl': dataUrl,
        'size': size,
      }),
    );
    return AttachmentModel.fromJson(jsonDecode(response.body));
  }

  Future<Map<String, dynamic>> getSettings() async {
    final response = await http.get(Uri.parse('$baseUrl/settings'));
    return jsonDecode(response.body);
  }
}
