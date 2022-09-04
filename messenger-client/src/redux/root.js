import { configureStore } from "@reduxjs/toolkit";
import { messages } from "./messages.reducer";

export const store = configureStore({
    reducer: messages.reducer
})