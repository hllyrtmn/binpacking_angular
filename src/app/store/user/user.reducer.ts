import { createReducer, on } from '@ngrx/store';
import { initialUserState } from './user.state';
import * as UserActions from './user.actions';

export const userReducer = createReducer(
  initialUserState,

  // Load User
  on(UserActions.loadUser, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UserActions.loadUserSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),

  on(UserActions.loadUserFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Profile
  on(UserActions.updateProfile, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UserActions.updateProfileSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),

  on(UserActions.updateProfileFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(UserActions.updateProfilePicture, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UserActions.updateProfilePictureSuccess, (state, { user }) => ({
    ...state,
    user,
    loading: false,
    error: null
  })),

  on(UserActions.updateProfilePictureFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(UserActions.changePassword, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(UserActions.changePasswordSuccess, (state) => ({
    ...state,
    loading: false,
    error: null
  })),

  on(UserActions.changePasswordFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  on(UserActions.clearUser, (state) => ({
    ...state,
    user: null,
    loading: false,
    error: null
  }))
);
