import { Router } from "express";

import chatsRouter from "./routes/chats.routes.js";
import messagesRouter from "./routes/messages.routes.js";
import reactionsRouter from "./routes/reactions.routes.js";
import searchRouter from "./routes/search.routes.js";
import fastApiRouter from "./routes/fastapi.routes.js";

const router = Router();

router.use(chatsRouter);
router.use(messagesRouter);
router.use(reactionsRouter);
router.use(searchRouter);
router.use(fastApiRouter);

export default router;
