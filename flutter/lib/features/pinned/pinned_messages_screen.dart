import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/chat/chat_bloc.dart';

class PinnedMessagesScreen extends StatelessWidget {
  const PinnedMessagesScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("پیام‌های پین‌شده (Pinned)"),
      ),
      body: BlocBuilder<ChatBloc, ChatState>(
        builder: (context, state) {
          if (state is ChatsLoadedState) {
            final pinnedMessages = state.messages.where((m) => m.isPinned).toList();

            if (pinnedMessages.isEmpty) {
              return const Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.push_pin_outlined, size: 48, color: Colors.grey),
                    SizedBox(height: 12),
                    Text("هیچ پیامی پین نشده است", style: TextStyle(color: Colors.grey)),
                  ],
                ),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: pinnedMessages.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final msg = pinnedMessages[index];
                return ListTile(
                  leading: const Icon(Icons.push_pin, color: Colors.amber),
                  title: Text(msg.content, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  subtitle: Text("ارسال شده در: ${msg.createdAt}"),
                  trailing: IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () {
                      BlocProvider.of<ChatBloc>(context).add(TogglePinEvent(messageId: msg.id));
                    },
                  ),
                );
              },
            );
          }
          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }
}
