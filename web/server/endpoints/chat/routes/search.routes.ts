import express, { Request, Response } from "express";
import {users, chats, messages} from "../../../store/dataStore.js";

const router = express.Router();

router.get("/search",  (req: Request, res: Response) => {
    const query = (
      (req.query.q as string) || ""
    ).toLowerCase();

    if (!query) {
      return res.json({
        users: [],
        chats: [],
        messages: [],
      });
    }

    const matchedUsers = users.filter(
      (u) =>
        u.displayName
          .toLowerCase()
          .includes(query) ||
        u.phone.includes(query)
    );

    const matchedChats = chats.filter(
      (c) =>
        c.title
          .toLowerCase()
          .includes(query) ||
        (c.description &&
          c.description
            .toLowerCase()
            .includes(query)) ||
        (c.username &&
          c.username
            .toLowerCase()
            .includes(query))
    );

    const matchedMessages = messages.filter(
      (m) =>
        m.content
          .toLowerCase()
          .includes(query)
    );

    res.json({
      users: matchedUsers,
      chats: matchedChats,
      messages: matchedMessages,
    });
  }
);

export default router;
