import 'dart:async';
import 'dart:convert';
import 'package:web_socket_channel/web_socket_channel.dart';
import '../core/utils/constants.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  final StreamController<Map<String, dynamic>> _eventsController = StreamController.broadcast();

  Stream<Map<String, dynamic>> get events => _eventsController.stream;

  void connect() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(AppConstants.wsUrl));
      _channel!.stream.listen((message) {
        final data = jsonDecode(message);
        _eventsController.add(data);
      }, onError: (err) {
        print("WebSocket Error: $err");
      }, onDone: () {
        print("WebSocket Connection Closed");
      });
    } catch (e) {
      print("WebSocket Exception: $e");
    }
  }

  void sendTyping(String chatId, bool isTyping) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({
        'type': 'typing',
        'chatId': chatId,
        'isTyping': isTyping,
      }));
    }
  }

  void dispose() {
    _channel?.sink.close();
    _eventsController.close();
  }
}
