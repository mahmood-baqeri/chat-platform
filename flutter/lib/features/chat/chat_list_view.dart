import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../bloc/chat/chat_bloc.dart';
import '../../models/chat_model.dart';

class ChatListView extends StatefulWidget {
  const ChatListView({Key? key}) : super(key: key);

  @override
  State<ChatListView> createState() => _ChatListViewState();
}

class _ChatListViewState extends State<ChatListView> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _titleController = TextEditingController();
  final TextEditingController _usernameController = TextEditingController();
  final TextEditingController _descController = TextEditingController();
  bool _isPrivate = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
  }

  void _showCreateChatModal(BuildContext context, String defaultType) {
    _titleController.clear();
    _usernameController.clear();
    _descController.clear();
    _isPrivate = false;
    String selectedType = defaultType;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Theme.of(context).cardColor,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return StatefulWidget(
          builder: (context, setModalState) {
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          selectedType == 'group' ? "ایجاد گروه جدید" : "ایجاد کانال جدید",
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(context),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    TextField(
                      controller: _titleController,
                      decoration: InputDecoration(
                        labelText: selectedType == 'group' ? "نام گروه" : "نام کانال",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _usernameController,
                      decoration: InputDecoration(
                        labelText: "شناسه کاربری (آیدی)",
                        prefixText: "@",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _descController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: "توضیحات",
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      value: _isPrivate,
                      title: const Text("خصوصی (Private)"),
                      subtitle: const Text("فقط با لینک دعوت قابل دسترسی باشد"),
                      onChanged: (val) {
                        setModalState(() => _isPrivate = val);
                      },
                    ),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.primary,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: () {
                          if (_titleController.text.trim().isNotEmpty) {
                            BlocProvider.of<ChatBloc>(context).add(
                              CreateChatEvent(
                                type: selectedType,
                                title: _titleController.text.trim(),
                                username: _usernameController.text.trim(),
                                description: _descController.text.trim(),
                                isPrivate: _isPrivate,
                              ),
                            );
                            Navigator.pop(context);
                          }
                        },
                        child: const Text("ایجاد", style: TextStyle(color: Colors.white, fontSize: 16)),
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("پیام‌رسان هوشمند", style: TextStyle(fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.push_pin_outlined, color: Colors.amber),
            onPressed: () => Navigator.pushNamed(context, '/pinned'),
          ),
          IconButton(
            icon: const Icon(Icons.notifications_outlined),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Theme.of(context).colorScheme.primary,
          tabs: const [
            Tab(text: "همه"),
            Tab(text: "شخصی"),
            Tab(text: "گروه‌ها"),
            Tab(text: "کانال‌ها"),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        backgroundColor: Theme.of(context).colorScheme.primary,
        child: const Icon(Icons.add, color: Colors.white),
        onPressed: () {
          showModalBottomSheet(
            context: context,
            backgroundColor: Theme.of(context).cardColor,
            shape: const RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
            ),
            builder: (ctx) {
              return Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Colors.blueAccent,
                        child: Icon(Icons.group_add, color: Colors.white),
                      ),
                      title: const Text("ایجاد گروه جدید"),
                      subtitle: const Text("چت گروهی با اعضا"),
                      onTap: () {
                        Navigator.pop(ctx);
                        _showCreateChatModal(context, 'group');
                      },
                    ),
                    const Divider(),
                    ListTile(
                      leading: const CircleAvatar(
                        backgroundColor: Colors.purpleAccent,
                        child: Icon(Icons.campaign, color: Colors.white),
                      ),
                      title: const Text("ایجاد کانال جدید"),
                      subtitle: const Text("انتشار اخبار و مطالب عمومی/خصوصی"),
                      onTap: () {
                        Navigator.pop(ctx);
                        _showCreateChatModal(context, 'channel');
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
      body: BlocBuilder<ChatBloc, ChatState>(
        builder: (context, state) {
          if (state is ChatLoadingState) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state is ChatsLoadedState) {
            if (state.chats.isEmpty) {
              return const Center(
                child: Text(
                  "هیچ گفتگویی یافت نشد",
                  style: TextStyle(color: Colors.grey),
                ),
              );
            }

            return TabBarView(
              controller: _tabController,
              children: [
                _buildChatList(state.chats),
                _buildChatList(state.chats.where((c) => c.type == 'direct').toList()),
                _buildChatList(state.chats.where((c) => c.type == 'group').toList()),
                _buildChatList(state.chats.where((c) => c.type == 'channel').toList()),
              ],
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildChatList(List<ChatModel> chats) {
    if (chats.isEmpty) {
      return const Center(
        child: Text("گفتگویی در این بخش وجود ندارد", style: TextStyle(color: Colors.grey)),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: chats.length,
      separatorBuilder: (context, index) => const Divider(height: 1, indent: 70),
      itemBuilder: (context, index) {
        final chat = chats[index];
        IconData typeIcon = Icons.person;
        Color typeColor = Colors.blue;

        if (chat.type == 'group') {
          typeIcon = Icons.group;
          typeColor = Colors.green;
        } else if (chat.type == 'channel') {
          typeIcon = Icons.campaign;
          typeColor = Colors.purple;
        }

        return ListTile(
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          leading: Stack(
            children: [
              CircleAvatar(
                radius: 26,
                backgroundImage: NetworkImage(
                  chat.avatarUrl.isNotEmpty
                      ? chat.avatarUrl
                      : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
                ),
              ),
              Positioned(
                bottom: 0,
                right: 0,
                child: CircleAvatar(
                  radius: 9,
                  backgroundColor: typeColor,
                  child: Icon(typeIcon, size: 10, color: Colors.white),
                ),
              ),
            ],
          ),
          title: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  chat.title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              Text(
                chat.lastMessageTime,
                style: const TextStyle(color: Colors.grey, fontSize: 11),
              ),
            ],
          ),
          subtitle: Row(
            children: [
              Expanded(
                child: Text(
                  chat.lastMessage.isNotEmpty ? chat.lastMessage : "پیامی ارسال نشده است",
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ),
              if (chat.unreadCount > 0)
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: const BoxDecoration(
                    color: Colors.blueAccent,
                    shape: BoxShape.circle,
                  ),
                  child: Text(
                    "${chat.unreadCount}",
                    style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                ),
            ],
          ),
          onTap: () {
            BlocProvider.of<ChatBloc>(context).add(SelectChatEvent(chat));
            Navigator.pushNamed(context, '/chat_detail', arguments: chat);
          },
        );
      },
    );
  }
}
