import { getDb } from "../mongodb.js";
import { v4 as uuidv4 } from "uuid";

export class MongoUserRepository {
  constructor() {
    this.collectionName = "users";
  }

  async getCollection() {
    const db = await getDb();
    return db.collection(this.collectionName);
  }

  async createUser(userData) {
    try {
      const collection = await this.getCollection();

      const user = {
        id: uuidv4(),
        ...userData,
        createdAt: new Date().toISOString(),
        avatarUrl: null,
        totalPoints: 0,
        roommateOptIn: true, // Default privacy setting ON
        roommatePlatforms: [],
        roommateNiche: null,
        roommateTimezone: null,
        roommateRegion: null,
        roommateExperience: null,
      };

      await collection.insertOne(user);
      console.log("MongoDB: Created user:", user.email);

      return user;
    } catch (error) {
      console.error("MongoDB: Error creating user:", error);
      return null;
    }
  }

  async getUserById(id) {
    try {
      const collection = await this.getCollection();
      const user = await collection.findOne({ id });
      return user;
    } catch (error) {
      console.error("MongoDB: Error getting user by ID:", error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      const collection = await this.getCollection();
      const user = await collection.findOne({ email });
      return user;
    } catch (error) {
      console.error("MongoDB: Error getting user by email:", error);
      return null;
    }
  }

  async getUserByUsername(username) {
    try {
      const collection = await this.getCollection();
      const user = await collection.findOne({
        username: { $regex: new RegExp(`^${username}$`, "i") },
      });
      return user;
    } catch (error) {
      console.error("MongoDB: Error getting user by username:", error);
      return null;
    }
  }

  async updateUser(id, updates) {
    try {
      const collection = await this.getCollection();

      const result = await collection.updateOne({ id }, { $set: updates });

      if (result.matchedCount === 0) {
        console.error("MongoDB: User not found for update:", id);
        return null;
      }

      // Return updated user
      const updatedUser = await collection.findOne({ id });
      console.log("MongoDB: Updated user:", updatedUser.email);

      return updatedUser;
    } catch (error) {
      console.error("MongoDB: Error updating user:", error);
      return null;
    }
  }

  async getAllUsers() {
    try {
      const collection = await this.getCollection();
      const users = await collection.find({}).toArray();
      return users;
    } catch (error) {
      console.error("MongoDB: Error getting all users:", error);
      return [];
    }
  }

  async deleteUser(id) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ id });
      return result.deletedCount > 0;
    } catch (error) {
      console.error("MongoDB: Error deleting user:", error);
      return false;
    }
  }
}

// Create a singleton instance
export const mongoUserRepo = new MongoUserRepository();
