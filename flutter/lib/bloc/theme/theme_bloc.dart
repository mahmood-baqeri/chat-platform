import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';

abstract class ThemeEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class ToggleThemeEvent extends ThemeEvent {
  final bool isDark;
  ToggleThemeEvent(this.isDark);
  @override
  List<Object?> get props => [isDark];
}

class ThemeState extends Equatable {
  final bool isDark;
  const ThemeState({required this.isDark});
  @override
  List<Object?> get props => [isDark];
}

class ThemeBloc extends Bloc<ThemeEvent, ThemeState> {
  ThemeBloc() : super(const ThemeState(isDark: true)) {
    on<ToggleThemeEvent>((event, emit) {
      emit(ThemeState(isDark: event.isDark));
    });
  }
}
