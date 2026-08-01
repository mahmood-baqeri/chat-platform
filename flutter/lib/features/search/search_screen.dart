import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/chat/chat_bloc.dart';
import '../../models/chat_model.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _query = "";

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: TextField(
          controller: _searchController,
          style: TextStyle(color: Theme.of(context).textTheme.bodyLarge?.color, fontSize: 14),
          decoration: const InputDecoration(
            hintText: "جستجو در پیام‌ها، گفتگوها و آیدی‌ها...",
            border: InputBorder.none,
          ),
          onChanged: (val) {
            setState(() {
              _query = val.trim().toLowerCase();
            });
          },
        ),
      ),
      body: BlocBuilder<ChatBloc, ChatState>(
        builder: (context, state) {
          if (state is ChatsLoadedState) {
            final filteredChats = state.chats.where((c) {
              return c.title.toLowerCase().contains(_query) ||
                  c.username.toLowerCase().contains(_query) ||
                  c.lastMessage.toLowerCase().contains(_query);
            }).toList();

            if (_query.isEmpty) {
              return const Center(
                child: Text("عبارت مورد نظر خود را برای جستجو وارد کنید", style: TextStyle(color: Colors.grey, fontSize: 13)),
              );
            }

            if (filteredChats.isEmpty) {
              return const Center(
                child: Text("نتیجه‌ای یافت نشد", style: TextStyle(color: Colors.grey, fontSize: 13)),
              );
            }

            return ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: filteredChats.length,
              separatorBuilder: (context, index) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final chat = filteredChats[index];
                return ListTile(
                  leading: CircleAvatar(
                    backgroundImage: NetworkImage(
                      chat.avatarUrl.isNotEmpty
                          ? chat.avatarUrl
                          : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
                    ),
                  ),
                  title: Text(chat.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text(chat.lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis),
                  onTap: () {
                    BlocProvider.of<ChatBloc>(context).add(SelectChatEvent(chat));
                    Navigator.pushNamed(context, '/chat_detail', arguments: chat);
                  },
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
