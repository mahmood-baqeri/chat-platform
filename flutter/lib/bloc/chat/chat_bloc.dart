import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/chat_model.dart';
import '../../models/message_model.dart';
import '../../repositories/chat_repository.dart';

// Events
abstract class ChatEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadChatsEvent extends ChatEvent {
  final String? userId;
  LoadChatsEvent({this.userId});
  @override
  List<Object?> get props => [userId];
}

class CreateChatEvent extends ChatEvent {
  final String type;
  final String title;
  final String? description;
  final String? avatarUrl;
  final String? username;
  final bool isPrivate;
  final String? ownerId;

  CreateChatEvent({
    required this.type,
    required this.title,
    this.description,
    this.avatarUrl,
    this.username,
    this.isPrivate = false,
    this.ownerId,
  });

  @override
  List<Object?> get props => [type, title, description, avatarUrl, username, isPrivate, ownerId];
}

class SelectChatEvent extends ChatEvent {
  final ChatModel chat;
  SelectChatEvent(this.chat);
  @override
  List<Object?> get props => [chat];
}

class LoadMoreMessagesEvent extends ChatEvent {
  final String chatId;
  LoadMoreMessagesEvent(this.chatId);
  @override
  List<Object?> get props => [chatId];
}

class SendMessageEvent extends ChatEvent {
  final String chatId;
  final String content;
  final String senderId;
  final String type;
  final List<AttachmentModel>? attachments;
  final String? replyToMessageId;
  final MessageModel? replyToMessage;
  final Map<String, dynamic>? forwardedFrom;

  SendMessageEvent({
    required this.chatId,
    required this.content,
    this.senderId = 'user-1',
    this.type = 'text',
    this.attachments,
    this.replyToMessageId,
    this.replyToMessage,
    this.forwardedFrom,
  });

  @override
  List<Object?> get props => [chatId, content, senderId, type, attachments, replyToMessageId, replyToMessage, forwardedFrom];
}

class EditMessageEvent extends ChatEvent {
  final String messageId;
  final String newContent;
  EditMessageEvent({required this.messageId, required this.newContent});
  @override
  List<Object?> get props => [messageId, newContent];
}

class DeleteMessageEvent extends ChatEvent {
  final String messageId;
  DeleteMessageEvent({required this.messageId});
  @override
  List<Object?> get props => [messageId];
}

class ToggleReactionEvent extends ChatEvent {
  final String messageId;
  final String emoji;
  final String userId;
  ToggleReactionEvent({required this.messageId, required this.emoji, required this.userId});
  @override
  List<Object?> get props => [messageId, emoji, userId];
}

class TogglePinEvent extends ChatEvent {
  final String messageId;
  TogglePinEvent({required this.messageId});
  @override
  List<Object?> get props => [messageId];
}

class MarkAsReadEvent extends ChatEvent {
  final String chatId;
  final String userId;
  MarkAsReadEvent({required this.chatId, required this.userId});
  @override
  List<Object?> get props => [chatId, userId];
}

class ReceiveRealtimeMessageEvent extends ChatEvent {
  final MessageModel message;
  ReceiveRealtimeMessageEvent(this.message);
  @override
  List<Object?> get props => [message];
}

class ReceiveRealtimeUpdateEvent extends ChatEvent {
  final String type; // message:updated, message:deleted, message:reaction_updated, etc.
  final Map<String, dynamic> data;
  ReceiveRealtimeUpdateEvent({required this.type, required this.data});
  @override
  List<Object?> get props => [type, data];
}

// States
abstract class ChatState extends Equatable {
  @override
  List<Object?> get props => [];
}

class ChatInitialState extends ChatState {}
class ChatLoadingState extends ChatState {}

class ChatsLoadedState extends ChatState {
  final List<ChatModel> chats;
  final ChatModel? activeChat;
  final List<MessageModel> messages;
  final bool hasMoreMessages;
  final bool isLoadingMore;

  ChatsLoadedState({
    required this.chats,
    this.activeChat,
    this.messages = const [],
    this.hasMoreMessages = false,
    this.isLoadingMore = false,
  });

  ChatsLoadedState copyWith({
    List<ChatModel>? chats,
    ChatModel? activeChat,
    List<MessageModel>? messages,
    bool? hasMoreMessages,
    bool? isLoadingMore,
  }) {
    return ChatsLoadedState(
      chats: chats ?? this.chats,
      activeChat: activeChat ?? this.activeChat,
      messages: messages ?? this.messages,
      hasMoreMessages: hasMoreMessages ?? this.hasMoreMessages,
      isLoadingMore: isLoadingMore ?? this.isLoadingMore,
    );
  }

  @override
  List<Object?> get props => [chats, activeChat, messages, hasMoreMessages, isLoadingMore];
}

class ChatErrorState extends ChatState {
  final String message;
  ChatErrorState(this.message);
  @override
  List<Object?> get props => [message];
}

// BLoC
class ChatBloc extends Bloc<ChatEvent, ChatState> {
  final ChatRepository repository;

  ChatBloc({required this.repository}) : super(ChatInitialState()) {
    on<LoadChatsEvent>((event, emit) async {
      emit(ChatLoadingState());
      try {
        final chats = await repository.fetchChats(userId: event.userId);
        emit(ChatsLoadedState(chats: chats));
      } catch (e) {
        emit(ChatErrorState("خطا در دریافت لیست گفتگوها"));
      }
    });

    on<CreateChatEvent>((event, emit) async {
      try {
        final newChat = await repository.createChat(
          type: event.type,
          title: event.title,
          description: event.description,
          avatarUrl: event.avatarUrl,
          username: event.username,
          isPrivate: event.isPrivate,
          ownerId: event.ownerId,
        );
        if (state is ChatsLoadedState) {
          final currentState = state as ChatsLoadedState;
          final updatedChats = [newChat, ...currentState.chats];
          emit(currentState.copyWith(chats: updatedChats));
        } else {
          emit(ChatsLoadedState(chats: [newChat]));
        }
      } catch (e) {
        // error creation
      }
    });

    on<SelectChatEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          final result = await repository.fetchMessages(event.chat.id, limit: 20);
          final messages = (result['messages'] as List<MessageModel>).reversed.toList();
          final hasMore = result['hasMore'] as bool;
          emit(currentState.copyWith(
            activeChat: event.chat,
            messages: messages,
            hasMoreMessages: hasMore,
          ));
        } catch (e) {
          emit(currentState.copyWith(activeChat: event.chat, messages: [], hasMoreMessages: false));
        }
      }
    });

    on<LoadMoreMessagesEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        if (!currentState.hasMoreMessages || currentState.isLoadingMore || currentState.messages.isEmpty) return;
        emit(currentState.copyWith(isLoadingMore: true));
        try {
          final oldestMessageId = currentState.messages.first.id;
          final result = await repository.fetchMessages(event.chatId, limit: 20, beforeId: oldestMessageId);
          final olderMessages = (result['messages'] as List<MessageModel>).reversed.toList();
          final hasMore = result['hasMore'] as bool;
          final combined = [...olderMessages, ...currentState.messages];
          emit(currentState.copyWith(
            messages: combined,
            hasMoreMessages: hasMore,
            isLoadingMore: false,
          ));
        } catch (e) {
          emit(currentState.copyWith(isLoadingMore: false));
        }
      }
    });

    on<SendMessageEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          final newMsg = await repository.sendMessage(
            event.chatId,
            event.content,
            senderId: event.senderId,
            type: event.type,
            attachments: event.attachments,
            replyToMessageId: event.replyToMessageId,
            replyToMessage: event.replyToMessage,
            forwardedFrom: event.forwardedFrom,
          );
          final updatedMessages = List<MessageModel>.from(currentState.messages)..add(newMsg);
          emit(currentState.copyWith(messages: updatedMessages));
        } catch (e) {
          // Failure handling
        }
      }
    });

    on<EditMessageEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          final updatedMsg = await repository.editMessage(event.messageId, event.newContent);
          final updatedList = currentState.messages.map((m) {
            return m.id == event.messageId ? updatedMsg : m;
          }).toList();
          emit(currentState.copyWith(messages: updatedList));
        } catch (e) {
          // error editing
        }
      }
    });

    on<DeleteMessageEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          await repository.deleteMessage(event.messageId);
          final updatedList = currentState.messages.where((m) => m.id != event.messageId).toList();
          emit(currentState.copyWith(messages: updatedList));
        } catch (e) {
          // error deleting
        }
      }
    });

    on<ToggleReactionEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          final updatedMsg = await repository.toggleReaction(event.messageId, event.emoji, event.userId);
          final updatedList = currentState.messages.map((m) {
            return m.id == event.messageId ? updatedMsg : m;
          }).toList();
          emit(currentState.copyWith(messages: updatedList));
        } catch (e) {
          // reaction error
        }
      }
    });

    on<TogglePinEvent>((event, emit) async {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        try {
          final updatedMsg = await repository.togglePin(event.messageId);
          final updatedList = currentState.messages.map((m) {
            return m.id == event.messageId ? updatedMsg : m;
          }).toList();
          emit(currentState.copyWith(messages: updatedList));
        } catch (e) {
          // pin error
        }
      }
    });

    on<MarkAsReadEvent>((event, emit) async {
      try {
        await repository.markChatAsRead(event.chatId, event.userId);
      } catch (e) {
        // read error
      }
    });

    on<ReceiveRealtimeMessageEvent>((event, emit) {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        if (currentState.activeChat?.id == event.message.chatId) {
          final updatedMessages = List<MessageModel>.from(currentState.messages)..add(event.message);
          emit(currentState.copyWith(messages: updatedMessages));
        }
      }
    });

    on<ReceiveRealtimeUpdateEvent>((event, emit) {
      if (state is ChatsLoadedState) {
        final currentState = state as ChatsLoadedState;
        if (event.type == 'message:updated' || event.type == 'message:reaction_updated') {
          final updatedMsg = MessageModel.fromJson(event.data);
          final updatedList = currentState.messages.map((m) {
            return m.id == updatedMsg.id ? updatedMsg : m;
          }).toList();
          emit(currentState.copyWith(messages: updatedList));
        } else if (event.type == 'message:deleted') {
          final messageId = event.data['id'] ?? event.data['messageId'];
          final updatedList = currentState.messages.where((m) => m.id != messageId).toList();
          emit(currentState.copyWith(messages: updatedList));
        }
      }
    });
  }
}
