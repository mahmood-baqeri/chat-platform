import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import '../../models/user_model.dart';
import '../../repositories/auth_repository.dart';

// Events
abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class SendOtpEvent extends AuthEvent {
  final String phone;
  SendOtpEvent(this.phone);
  @override
  List<Object?> get props => [phone];
}

class VerifyOtpEvent extends AuthEvent {
  final String phone;
  final String code;
  VerifyOtpEvent(this.phone, this.code);
  @override
  List<Object?> get props => [phone, code];
}

class UpdateProfileEvent extends AuthEvent {
  final String userId;
  final String? firstName;
  final String? lastName;
  final String? displayName;
  final String? username;
  final String? bio;
  final String? avatarUrl;

  UpdateProfileEvent({
    required this.userId,
    this.firstName,
    this.lastName,
    this.displayName,
    this.username,
    this.bio,
    this.avatarUrl,
  });

  @override
  List<Object?> get props => [userId, firstName, lastName, displayName, username, bio, avatarUrl];
}

class LogoutEvent extends AuthEvent {}

// States
abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitialState extends AuthState {}
class AuthLoadingState extends AuthState {}
class OtpSentState extends AuthState {
  final String phone;
  OtpSentState(this.phone);
  @override
  List<Object?> get props => [phone];
}
class AuthenticatedState extends AuthState {
  final UserModel user;
  final String token;
  AuthenticatedState(this.user, {this.token = 'demo_token'});
  @override
  List<Object?> get props => [user, token];
}
class UnauthenticatedState extends AuthState {}
class AuthErrorState extends AuthState {
  final String message;
  AuthErrorState(this.message);
  @override
  List<Object?> get props => [message];
}

// BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository repository;

  AuthBloc({required this.repository}) : super(AuthInitialState()) {
    on<SendOtpEvent>((event, emit) async {
      emit(AuthLoadingState());
      try {
        await repository.sendOtp(event.phone);
        emit(OtpSentState(event.phone));
      } catch (e) {
        emit(AuthErrorState("خطا در ارسال کد تایید"));
      }
    });

    on<VerifyOtpEvent>((event, emit) async {
      emit(AuthLoadingState());
      try {
        final res = await repository.verifyOtp(event.phone, event.code);
        final user = UserModel.fromJson(res['user'] ?? res);
        final token = res['token'] ?? 'demo_token';
        emit(AuthenticatedState(user, token: token));
      } catch (e) {
        emit(AuthErrorState("کد تایید اشتباه است"));
      }
    });

    on<UpdateProfileEvent>((event, emit) async {
      if (state is AuthenticatedState) {
        final token = (state as AuthenticatedState).token;
        emit(AuthLoadingState());
        try {
          final updatedUser = await repository.updateProfile(
            userId: event.userId,
            firstName: event.firstName,
            lastName: event.lastName,
            displayName: event.displayName,
            username: event.username,
            bio: event.bio,
            avatarUrl: event.avatarUrl,
          );
          emit(AuthenticatedState(updatedUser, token: token));
        } catch (e) {
          emit(AuthErrorState("خطا در به روزرسانی پروفایل"));
        }
      }
    });

    on<LogoutEvent>((event, emit) {
      emit(UnauthenticatedState());
    });
  }
}
