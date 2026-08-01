import '../models/user_model.dart';
import '../services/api_service.dart';

class AuthRepository {
  final ApiService apiService;

  AuthRepository({required this.apiService});

  Future<Map<String, dynamic>> sendOtp(String phone) {
    return apiService.sendOtp(phone);
  }

  Future<Map<String, dynamic>> verifyOtp(String phone, String code) {
    return apiService.verifyOtp(phone, code);
  }

  Future<Map<String, dynamic>> getCurrentUser(String token) {
    return apiService.getCurrentUser(token);
  }

  Future<UserModel> updateProfile({
    required String userId,
    String? firstName,
    String? lastName,
    String? displayName,
    String? username,
    String? bio,
    String? avatarUrl,
  }) {
    return apiService.updateProfile(
      userId: userId,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      username: username,
      bio: bio,
      avatarUrl: avatarUrl,
    );
  }
}
