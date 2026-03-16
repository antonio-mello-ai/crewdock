"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Anchor, Sparkles, MessageSquare, ListTodo } from "lucide-react";

export function OnboardingWelcome() {
  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="text-center mb-10">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-4">
          <Anchor className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Welcome to CrewDock</h1>
        <p className="text-muted-foreground mt-2">
          Set up your AI crew in 3 steps.
        </p>
      </div>

      <div className="space-y-4">
        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Create your first agent</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Install a pre-configured template or create a custom agent.
                </p>
              </div>
              <Link href="/templates">
                <Button size="sm" className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Browse Templates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground font-bold">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Chat with your agent</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Start a conversation to test the agent with your knowledge base.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground font-bold">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Create tasks</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Assign recurring tasks with cron schedules for automated work.
                </p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                <ListTodo className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
