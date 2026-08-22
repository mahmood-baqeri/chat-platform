import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'core/theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/websocket_service.dart';
import 'repositories/auth_repository.dart';
import 'repositories/chat_repository.dart';
import 'bloc/auth/auth_bloc.dart';
import 'bloc/chat/chat_bloc.dart';
import 'bloc/theme/theme_bloc.dart';
import 'models/chat_model.dart';
import 'models/message_model.dart';

import 'features/splash/splash_screen.dart';
import 'features/auth/login_screen.dart';
import 'features/auth/otp_screen.dart';
import 'features/home/home_screen.dart';
import 'features/chat/chat_detail_screen.dart';
import 'features/pinned/pinned_messages_screen.dart';
import 'features/notifications/notifications_screen.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final apiService = ApiService();
    final authRepository = AuthRepository(apiService: apiService);
    final chatRepository = ChatRepository(apiService: apiService);
    final wsService = WebSocketService();

    wsService.connect();

    final chatBloc = ChatBloc(repository: chatRepository);

    wsService.events.listen((event) {
      final type = event['type'];
      if (type == 'message:new' && event['message'] != null) {
        final msg = MessageModel.fromJson(event['message']);
        chatBloc.add(ReceiveRealtimeMessageEvent(msg));
      } else if (type == 'message:updated' ||
          type == 'message:deleted' ||
          type == 'message:reaction_updated') {
        chatBloc.add(ReceiveRealtimeUpdateEvent(type: type, data: event));
      }
    });

    return MultiBlocProvider(
      providers: [
        BlocProvider(create: (_) => ThemeBloc()),
        BlocProvider(create: (_) => AuthBloc(repository: authRepository)),
        BlocProvider.value(value: chatBloc),
      ],
      child: BlocBuilder<ThemeBloc, ThemeState>(
        builder: (context, themeState) {
          return MaterialApp(
            title: 'فیــــدار',
            debugShowCheckedModeBanner: false,
            themeMode: themeState.isDark ? ThemeMode.dark : ThemeMode.light,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            locale: const Locale('fa', 'IR'),
            supportedLocales: const [
              Locale('fa', 'IR'),
              Locale('en', 'US'),
            ],
            localizationsDelegates: const [
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            initialRoute: '/',
            routes: {
              '/': (context) => const SplashScreen(),
              '/login': (context) => const LoginScreen(),
              '/home': (context) => const HomeScreen(),
              '/pinned': (context) => const PinnedMessagesScreen(),
              '/notifications': (context) => const NotificationsScreen(),
            },
            onGenerateRoute: (settings) {
              if (settings.name == '/otp') {
                final phone = settings.arguments as String;
                return MaterialPageRoute(
                  builder: (context) => OtpScreen(phone: phone),
                );
              }
              if (settings.name == '/chat_detail') {
                final chat = settings.arguments as ChatModel;
                return MaterialPageRoute(
                  builder: (context) => ChatDetailScreen(chat: chat),
                );
              }
              return null;
            },
          );
        },
      ),
    );
  }
}
