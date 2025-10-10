"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { ArrowLeft, ExternalLink, Play, Scissors, User } from "lucide-react";

export default function ProfilePage({ params }) {
  const { username } = params;
  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast } = useToast();

  const isOwnProfile =
    currentUser && profile && currentUser.username === profile.user.username;

  useEffect(() => {
    loadCurrentUser();
    loadProfile(username);
  }, [username]);

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        const response = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const userData = await response.json();
          setCurrentUser(userData);
        }
      }
    } catch (error) {
      console.error("Error loading current user:", error);
    }
  };

  const loadProfile = async (username) => {
    try {
      const response = await fetch(`/api/users/${username}`);
      if (response.ok) {
        const profileData = await response.json();
        setProfile(profileData);
      } else if (response.status === 404) {
        setError("User not found");
      } else {
        setError("Failed to load profile");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleEngage = (postId) => {
    if (!currentUser) {
      toast({
        title: "Please sign in",
        description: "You need to be signed in to engage with posts.",
        variant: "destructive",
      });
      return;
    }

    // Open engage redirect in new tab
    const engageUrl = `/api/r/${postId}?u=${currentUser.id}`;
    window.open(engageUrl, "_blank");

    toast({
      title: "Engagement credited!",
      description: "+1 point for engaging with content.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => (window.location.href = "/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to House
              </Button>
              <h1 className="text-2xl font-bold text-purple-600">
                Creator Profile
              </h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Card>
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">{error}</h3>
              <p className="text-muted-foreground mb-4">
                {error === "User not found"
                  ? `The user "${username}" could not be found.`
                  : "There was an error loading this profile. Please try again."}
              </p>
              <Button onClick={() => (window.location.href = "/")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
        <Toaster />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => (window.location.href = "/")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to House
            </Button>
            <h1 className="text-2xl font-bold text-purple-600">
              Creator Profile
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.user.avatarUrl} />
                  <AvatarFallback className="text-2xl">
                    {profile.user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">
                    {profile.user.displayName}
                  </h2>
                  <p className="text-muted-foreground">
                    @{profile.user.username}
                  </p>
                  {profile.user.bio && (
                    <p className="mt-2 text-sm">{profile.user.bio}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined{" "}
                    {new Date(profile.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {profile.user.totalPoints}
                </div>
                <p className="text-sm text-muted-foreground">Total Points</p>

                {/* Points Summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {profile.user.pointsBreakdown.engage || 0}
                    </div>
                    <p className="text-xs text-blue-600">Engage</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {profile.user.pointsBreakdown.clip || 0}
                    </div>
                    <p className="text-xs text-green-600">Clips</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {profile.user.pointsBreakdown.collab || 0}
                    </div>
                    <p className="text-xs text-purple-600">Collabs</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Posts Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Recent Posts</CardTitle>
            <CardDescription>
              Posts from the last 7 days ({profile.posts.total} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.posts.items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No recent posts to show.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.posts.items.map((post) => (
                  <Card
                    key={post.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Thumbnail */}
                        {post.thumbnailUrl && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <img
                              src={post.thumbnailUrl}
                              alt={post.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Post Info */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{post.provider}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-sm line-clamp-2 mb-2">
                            {post.title}
                          </h3>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-2">
                          <div className="flex space-x-2">
                            {!isOwnProfile && currentUser && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEngage(post.id)}
                                  className="flex items-center space-x-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  <span>Engage</span>
                                </Button>

                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    (window.location.href = `/clip/create?postId=${post.id}`)
                                  }
                                  className="flex items-center space-x-1"
                                >
                                  <Scissors className="h-3 w-3" />
                                  <span>Create Clip</span>
                                </Button>
                              </>
                            )}
                          </div>

                          {post.clipCount > 0 && (
                            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                              <Play className="h-3 w-3" />
                              <span>{post.clipCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clips Made Section */}
        <Card>
          <CardHeader>
            <CardTitle>Clips Made</CardTitle>
            <CardDescription>
              Clips created by {profile.user.displayName} (
              {profile.clipsMade.total} total)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {profile.clipsMade.items.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No clips created yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.clipsMade.items.map((clip) => (
                  <Card
                    key={clip.id}
                    className="hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Clip Thumbnail */}
                        {clip.postThumbnailUrl && (
                          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                            <img
                              src={clip.postThumbnailUrl}
                              alt={clip.postTitle}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Clip Info */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="secondary" className="text-xs">
                              <Scissors className="h-3 w-3 mr-1" />
                              Clip
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(clip.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <h3 className="font-medium text-sm line-clamp-2">
                            {clip.postTitle}
                          </h3>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  );
}
