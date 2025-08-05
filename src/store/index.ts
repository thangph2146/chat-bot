import { configureStore } from "@reduxjs/toolkit";
import messageReducer from "./slices/messageSlice";
import aiAssistantReducer from "./slices/aiAssistantSlice";
import notificationReducer from "./slices/notificationSlice";

export const store = configureStore({
  reducer: {
    message: messageReducer,
    aiAssistant: aiAssistantReducer,
    notification: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST"],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
