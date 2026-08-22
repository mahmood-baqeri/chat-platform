import { Router } from "express";
import { requireAdmin } from "../../middleware/admin-auth.middleware.js";
import statsRouter from "./routes/stats.routes.js";
import usersRouter from "./routes/users.routes.js";
import forbiddenWordsRouter from "./routes/forbidden-words.routes.js";
import permissionsRouter from "./routes/permissions.routes.js";
import roomsRouter from "./routes/rooms.routes.js";
import groupsRouter from "./routes/groups.routes.js";
import channelsRouter from "./routes/channels.routes.js";
import messagesRouter from "./routes/messages.routes.js";
import filesRouter from "./routes/files.routes.js";
import logsRouter from "./routes/logs.routes.js";
import systemSettingsRouter from "./routes/system-settings.routes.js";

const router = Router();

// Defense in depth: the entire /admin namespace is protected.
router.use(requireAdmin);

router.use(statsRouter);
router.use(usersRouter);
router.use(forbiddenWordsRouter);
router.use(permissionsRouter);
router.use(roomsRouter);
router.use(groupsRouter);
router.use(channelsRouter);
router.use(messagesRouter);
router.use(filesRouter);
router.use(logsRouter);
router.use(systemSettingsRouter);

export default router;
