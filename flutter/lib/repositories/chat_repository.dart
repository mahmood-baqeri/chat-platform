import '../models/chat_model.dart';
import '../models/message_model.dart';
import '../services/api_service.dart';

class ChatRepository {
  final ApiService apiService;

  ChatRepository({required this.apiService});

  Future<List<ChatModel>> fetchChats({String? userId}) {
    return apiService.getChats(userId: userId);
  }

  Future<ChatModel> createChat({
    required String type,
    required String title,
    String? description,
    String? avatarUrl,
    String? username,
    bool isPrivate = false,
    String? ownerId,
  }) {
    return apiService.createChat(
      type: type,
      title: title,
      description: description,
      avatarUrl: avatarUrl,
      username: username,
      isPrivate: isPrivate,
      ownerId: ownerId,
    );
  }

  Future<Map<String, dynamic>> fetchMessages(String chatId, {int limit = 20, String? beforeId}) {
    return apiService.getMessages(chatId, limit: limit, beforeId: beforeId);
  }

  Future<List<MessageModel>> searchMessages(String chatId, {String q = '', String? type, String? senderId}) {
    return apiService.searchMessages(chatId, q: q, type: type, senderId: senderId);
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
  }) {
    return apiService.sendMessage(
      chatId,
      content,
      senderId: senderId,
      type: type,
      attachments: attachments,
      replyToMessageId: replyToMessageId,
      replyToMessage: replyToMessage,
      forwardedFrom: forwardedFrom,
    );
  }

  Future<MessageModel> editMessage(String messageId, String content) {
    return apiService.editMessage(messageId, content);
  }

  Future<void> deleteMessage(String messageId) {
    return apiService.deleteMessage(messageId);
  }

  Future<MessageModel> toggleReaction(String messageId, String emoji, String userId) {
    return apiService.toggleReaction(messageId, emoji, userId);
  }

  Future<MessageModel> togglePin(String messageId) {
    return apiService.togglePin(messageId);
  }

  Future<void> markChatAsRead(String chatId, String userId) {
    return apiService.markChatAsRead(chatId, userId);
  }

  Future<AttachmentModel> uploadAttachment(String fileName, String mimeType, String dataUrl, int size) {
    return apiService.uploadFile(fileName, mimeType, dataUrl, size);
  }
}
