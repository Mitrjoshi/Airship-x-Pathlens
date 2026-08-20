import { Router } from "express";

import {
  addChatChannelMemberController,
  archiveChatChannelController,
  createChatChannelController,
  createDmChannelController,
  deleteChatChannelController,
  getChatChannelsController,
  getChatChannelController,
  getChatPinsController,
  removeChatChannelMemberController,
  searchChatController,
  updateChatChannelController,
} from "../controllers/chat.controller";
import {
  addChatReactionController,
  deleteChatMessageController,
  editChatMessageController,
  getChatMessagesController,
  markChatReadController,
  pinChatMessageController,
  removeChatReactionController,
  sendChatMessageController,
  unpinChatMessageController,
} from "../controllers/chat-messages.controller";
import { streamChat } from "../controllers/chat-stream.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireChannelAccess } from "../middleware/channel-access.middleware";
import {
  requireAnyWorkspacePermission,
  requireWorkspacePermission,
} from "../middleware/permission.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/stream", streamChat);

router.get(
  "/channels",
  requireWorkspacePermission("chat.view"),
  getChatChannelsController
);
router.post(
  "/channels",
  requireWorkspacePermission("chat.create_channels"),
  createChatChannelController
);
router.post("/dms", requireWorkspacePermission("chat.send"), createDmChannelController);
router.get(
  "/search",
  requireWorkspacePermission("chat.view"),
  searchChatController
);
router.get(
  "/channels/:channel_id",
  requireChannelAccess,
  requireWorkspacePermission("chat.view"),
  getChatChannelController
);
router.patch(
  "/channels/:channel_id",
  requireChannelAccess,
  requireWorkspacePermission("chat.manage_channels"),
  updateChatChannelController
);
router.patch(
  "/channels/:channel_id/archive",
  requireChannelAccess,
  requireWorkspacePermission("chat.manage_channels"),
  archiveChatChannelController
);
router.delete(
  "/channels/:channel_id",
  requireChannelAccess,
  requireWorkspacePermission("chat.manage_channels"),
  deleteChatChannelController
);
router.post(
  "/channels/:channel_id/members",
  requireChannelAccess,
  requireWorkspacePermission("chat.manage_members"),
  addChatChannelMemberController
);
router.delete(
  "/channels/:channel_id/members/:user_id",
  requireChannelAccess,
  requireWorkspacePermission("chat.manage_members"),
  removeChatChannelMemberController
);
router.get(
  "/channels/:channel_id/pins",
  requireChannelAccess,
  requireWorkspacePermission("chat.view"),
  getChatPinsController
);
router.get(
  "/channels/:channel_id/messages",
  requireChannelAccess,
  requireWorkspacePermission("chat.view"),
  getChatMessagesController
);
router.post(
  "/channels/:channel_id/messages",
  requireChannelAccess,
  requireWorkspacePermission("chat.send"),
  sendChatMessageController
);
router.patch(
  "/messages/:message_id",
  requireChannelAccess,
  requireWorkspacePermission("chat.send"),
  editChatMessageController
);
router.delete(
  "/messages/:message_id",
  requireChannelAccess,
  requireAnyWorkspacePermission("chat.send", "chat.delete_messages"),
  deleteChatMessageController
);
router.post(
  "/messages/:message_id/reactions",
  requireChannelAccess,
  requireWorkspacePermission("chat.send"),
  addChatReactionController
);
router.delete(
  "/messages/:message_id/reactions/:emoji",
  requireChannelAccess,
  requireWorkspacePermission("chat.send"),
  removeChatReactionController
);
router.post(
  "/messages/:message_id/pin",
  requireChannelAccess,
  requireWorkspacePermission("chat.pin_messages"),
  pinChatMessageController
);
router.delete(
  "/messages/:message_id/pin",
  requireChannelAccess,
  requireWorkspacePermission("chat.pin_messages"),
  unpinChatMessageController
);
router.post(
  "/channels/:channel_id/read",
  requireChannelAccess,
  requireWorkspacePermission("chat.view"),
  markChatReadController
);

export default router;