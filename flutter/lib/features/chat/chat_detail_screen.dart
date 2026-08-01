import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../bloc/chat/chat_bloc.dart';
import '../../models/chat_model.dart';
import '../../models/message_model.dart';

class ChatDetailScreen extends StatefulWidget {
  final ChatModel chat;
  const ChatDetailScreen({Key? key, required this.chat}) : super(key: key);

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  final ImagePicker _picker = ImagePicker();

  MessageModel? _replyingTo;
  MessageModel? _editingMessage;
  bool _isRecordingVoice = false;
  int _recordingSeconds = 0;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 50) {
      BlocProvider.of<ChatBloc>(context).add(LoadMoreMessagesEvent(widget.chat.id));
    }
  }

  void _sendMessage() {
    final text = _messageController.text.trim();
    if (text.isEmpty && !_isRecordingVoice) return;

    if (_editingMessage != null) {
      BlocProvider.of<ChatBloc>(context).add(
        EditMessageEvent(messageId: _editingMessage!.id, newContent: text),
      );
      setState(() {
        _editingMessage = null;
        _messageController.clear();
      });
      return;
    }

    BlocProvider.of<ChatBloc>(context).add(
      SendMessageEvent(
        chatId: widget.chat.id,
        content: text.isNotEmpty ? text : "صدای ضبط شده (0:15)",
        type: _isRecordingVoice ? 'voice' : 'text',
        replyToMessageId: _replyingTo?.id,
        replyToMessage: _replyingTo,
      ),
    );

    setState(() {
      _replyingTo = null;
      _isRecordingVoice = false;
      _messageController.clear();
    });
  }

  void _pickAndSendImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      _showCaptionDialog(image.name, 'image', image.path);
    }
  }

  void _pickAndSendFile() async {
    final FilePickerResult? result = await FilePicker.platform.pickFiles();
    if (result != null && result.files.single.path != null) {
      final file = result.files.single;
      _showCaptionDialog(file.name, 'document', file.path!);
    }
  }

  void _showCaptionDialog(String fileName, String type, String filePath) {
    final TextEditingController captionController = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          title: Text(type == 'image' ? "ارسال تصویر" : "ارسال فایل"),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(fileName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              const SizedBox(height: 12),
              TextField(
                controller: captionController,
                decoration: const InputDecoration(
                  hintText: "توضیحات (کپشن)...",
                  border: OutlineInputBorder(),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text("انصراف"),
            ),
            ElevatedButton(
              onPressed: () {
                final attachment = AttachmentModel(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  name: fileName,
                  type: type,
                  url: filePath,
                  size: 1024 * 50,
                  mimeType: type == 'image' ? 'image/jpeg' : 'application/pdf',
                );
                BlocProvider.of<ChatBloc>(context).add(
                  SendMessageEvent(
                    chatId: widget.chat.id,
                    content: captionController.text.trim(),
                    type: type,
                    attachments: [attachment],
                  ),
                );
                Navigator.pop(ctx);
              },
              child: const Text("ارسال"),
            ),
          ],
        );
      },
    );
  }

  void _showSeenByModal(MessageModel msg) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text("افراد مشاهده‌کننده پیام", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 12),
              if (msg.seenBy.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 20),
                  child: Center(child: Text("هنوز کسی این پیام را مشاهده نکرده است.", style: TextStyle(color: Colors.grey))),
                )
              else
                Flexible(
                  child: ListView.builder(
                    shrinkWrap: true,
                    itemCount: msg.seenBy.length,
                    itemBuilder: (ctx, i) {
                      final seen = msg.seenBy[i];
                      return ListTile(
                        leading: CircleAvatar(
                          backgroundImage: NetworkImage(
                            seen.userAvatarUrl.isNotEmpty
                                ? seen.userAvatarUrl
                                : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
                          ),
                        ),
                        title: Text(seen.userDisplayName.isNotEmpty ? seen.userDisplayName : "کاربر " + seen.userId),
                        subtitle: Text("مشاهده شده در: ${seen.seenAt}"),
                      );
                    },
                  ),
                ),
            ],
          ),
        );
      },
    );
  }

  void _showMessageContextMenu(MessageModel msg, bool isMe) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Emoji Reactions Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: ['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) {
                  return InkWell(
                    onTap: () {
                      BlocProvider.of<ChatBloc>(context).add(
                        ToggleReactionEvent(messageId: msg.id, emoji: emoji, userId: 'user-1'),
                      );
                      Navigator.pop(ctx);
                    },
                    child: Padding(
                      padding: const EdgeInsets.all(8.0),
                      child: Text(emoji, style: const TextStyle(fontSize: 26)),
                    ),
                  );
                }).toList(),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.reply),
                title: const Text("پاسخ (Reply)"),
                onTap: () {
                  Navigator.pop(ctx);
                  setState(() => _replyingTo = msg);
                },
              ),
              ListTile(
                leading: const Icon(Icons.push_pin_outlined),
                title: Text(msg.isPinned ? "آن‌پین کردن" : "پین کردن پیام"),
                onTap: () {
                  Navigator.pop(ctx);
                  BlocProvider.of<ChatBloc>(context).add(TogglePinEvent(messageId: msg.id));
                },
              ),
              ListTile(
                leading: const Icon(Icons.remove_red_eye_outlined),
                title: const Text("مشاهده‌کنندگان پیام"),
                onTap: () {
                  Navigator.pop(ctx);
                  _showSeenByModal(msg);
                },
              ),
              if (isMe)
                ListTile(
                  leading: const Icon(Icons.edit_note, color: Colors.blue),
                  title: const Text("ویرایش پیام"),
                  onTap: () {
                    Navigator.pop(ctx);
                    setState(() {
                      _editingMessage = msg;
                      _messageController.text = msg.content;
                    });
                  },
                ),
              if (isMe)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: Colors.red),
                  title: const Text("حذف پیام", style: TextStyle(color: Colors.red)),
                  onTap: () {
                    Navigator.pop(ctx);
                    BlocProvider.of<ChatBloc>(context).add(DeleteMessageEvent(messageId: msg.id));
                  },
                ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            CircleAvatar(
              radius: 18,
              backgroundImage: NetworkImage(
                widget.chat.avatarUrl.isNotEmpty
                    ? widget.chat.avatarUrl
                    : 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150',
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.chat.title, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                  Text(
                    widget.chat.type == 'group'
                        ? "${widget.chat.memberCount} عضو"
                        : widget.chat.type == 'channel'
                            ? "کانال رسمی"
                            : "آنلاین",
                    style: const TextStyle(fontSize: 11, color: Colors.grey),
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.search),
            onPressed: () => Navigator.pushNamed(context, '/search'),
          ),
          IconButton(
            icon: const Icon(Icons.push_pin_outlined, color: Colors.amber),
            onPressed: () => Navigator.pushNamed(context, '/pinned'),
          ),
        ],
      ),
      body: Column(
        children: [
          // Messages List
          Expanded(
            child: BlocBuilder<ChatBloc, ChatState>(
              builder: (context, state) {
                if (state is ChatsLoadedState) {
                  final messages = state.messages;
                  return ListView.builder(
                    controller: _scrollController,
                    reverse: true,
                    padding: const EdgeInsets.all(16),
                    itemCount: messages.length + (state.isLoadingMore ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index == messages.length && state.isLoadingMore) {
                        return const Padding(
                          padding: EdgeInsets.all(8.0),
                          child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                        );
                      }
                      final msg = messages[messages.length - 1 - index];
                      final isMe = msg.senderId == 'user-1';

                      return InkWell(
                        onLongPress: () => _showMessageContextMenu(msg, isMe),
                        child: Align(
                          alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            margin: const EdgeInsets.symmetric(vertical: 4),
                            constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isMe
                                  ? Theme.of(context).colorScheme.primary
                                  : Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(16),
                              border: msg.isPinned ? Border.all(color: Colors.amber, width: 1.5) : null,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (msg.isPinned)
                                  const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Icon(Icons.push_pin, size: 12, color: Colors.amber),
                                      SizedBox(width: 4),
                                      Text("پین شده", style: TextStyle(fontSize: 10, color: Colors.amber)),
                                    ],
                                  ),
                                if (msg.replyToMessage != null)
                                  Container(
                                    margin: const EdgeInsets.only(bottom: 6),
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.black12,
                                      borderRadius: BorderRadius.circular(8),
                                      border: Border(right: BorderSide(color: Colors.amber, width: 3)),
                                    ),
                                    child: Text(
                                      msg.replyToMessage!.content,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isMe ? Colors.white70 : Colors.grey[700],
                                      ),
                                    ),
                                  ),
                                if (msg.type == 'voice')
                                  Row(
                                    children: [
                                      IconButton(
                                        icon: Icon(Icons.play_arrow, color: isMe ? Colors.white : Colors.blue),
                                        onPressed: () {},
                                      ),
                                      Expanded(
                                        child: LinearProgressIndicator(
                                          value: 0.4,
                                          backgroundColor: Colors.white24,
                                          valueColor: AlwaysStoppedAnimation<Color>(
                                            isMe ? Colors.white : Colors.blue,
                                          ),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Text("0:15", style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : Colors.grey)),
                                    ],
                                  )
                                else
                                  Text(
                                    msg.content,
                                    style: TextStyle(
                                      color: isMe ? Colors.white : Theme.of(context).textTheme.bodyMedium?.color,
                                      fontSize: 14,
                                    ),
                                  ),
                                if (msg.attachments.isNotEmpty)
                                  ...msg.attachments.map((a) {
                                    return Container(
                                      margin: const EdgeInsets.only(top: 8),
                                      child: Row(
                                        children: [
                                          Icon(a.type == 'image' ? Icons.image : Icons.insert_drive_file, color: isMe ? Colors.white : Colors.blue),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(a.name, style: TextStyle(fontSize: 12, color: isMe ? Colors.white70 : Colors.grey)),
                                          ),
                                        ],
                                      ),
                                    );
                                  }),
                                const SizedBox(height: 4),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    if (msg.reactions.isNotEmpty)
                                      ...msg.reactions.map((r) => Text("${r.emoji} ", style: const TextStyle(fontSize: 12))),
                                    if (msg.isEdited)
                                      Text(" (ویرایش شده)", style: TextStyle(fontSize: 9, color: isMe ? Colors.white54 : Colors.grey)),
                                    const SizedBox(width: 4),
                                    Text(
                                      msg.createdAt.contains('T') ? msg.createdAt.split('T')[1].substring(0, 5) : msg.createdAt,
                                      style: TextStyle(fontSize: 10, color: isMe ? Colors.white70 : Colors.grey),
                                    ),
                                    if (isMe) ...[
                                      const SizedBox(width: 4),
                                      Icon(
                                        msg.status == 'seen' ? Icons.done_all : msg.status == 'delivered' ? Icons.done_all : Icons.done,
                                        size: 14,
                                        color: msg.status == 'seen' ? Colors.cyanAccent : Colors.white70,
                                      ),
                                    ]
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  );
                }
                return const Center(child: CircularProgressIndicator());
              },
            ),
          ),

          // Replying / Editing banner
          if (_replyingTo != null || _editingMessage != null)
            Container(
              color: Theme.of(context).cardColor,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: Row(
                children: [
                  Icon(_editingMessage != null ? Icons.edit : Icons.reply, color: Theme.of(context).colorScheme.primary),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _editingMessage != null ? "ویرایش پیام" : "پاسخ به پیام",
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                        ),
                        Text(
                          _editingMessage?.content ?? _replyingTo?.content ?? "",
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(color: Colors.grey, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () {
                      setState(() {
                        _replyingTo = null;
                        _editingMessage = null;
                        _messageController.clear();
                      });
                    },
                  ),
                ],
              ),
            ),

          // Input Bar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: const Border(top: BorderSide(color: Colors.black12)),
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file),
                    onPressed: _pickAndSendFile,
                  ),
                  IconButton(
                    icon: const Icon(Icons.camera_alt),
                    onPressed: _pickAndSendImage,
                  ),
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: "پیام خود را بنویسید...",
                        border: InputBorder.none,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _messageController.text.trim().isEmpty ? Icons.mic : Icons.send,
                      color: Theme.of(context).colorScheme.primary,
                    ),
                    onPressed: () {
                      if (_messageController.text.trim().isEmpty) {
                        setState(() {
                          _isRecordingVoice = !_isRecordingVoice;
                        });
                        if (_isRecordingVoice) {
                          _sendMessage();
                        }
                      } else {
                        _sendMessage();
                      }
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
