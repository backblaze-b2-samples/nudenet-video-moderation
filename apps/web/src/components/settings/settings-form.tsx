"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { DangerZone } from "./danger-zone";

const settingsSchema = z.object({
  defaultSampleMode: z.enum(["fps-1", "fps-0.5", "keyframes"]),
  defaultThreshold: z
    .string()
    .regex(/^\d*\.?\d+$/, "Must be a number")
    .refine((v) => {
      const n = Number(v);
      return n >= 0 && n <= 1;
    }, "Must be between 0 and 1"),
  autoEscalateFlagged: z.boolean(),
});

type SettingsValues = z.infer<typeof settingsSchema>;

// These mirror the server-side env defaults (MODERATION_THRESHOLD, SAMPLE_MODE).
// This is a client-side preferences exemplar; the real defaults live in the API
// .env and are applied per-scan unless overridden on the New Scan form.
const defaultValues: SettingsValues = {
  defaultSampleMode: "fps-1",
  defaultThreshold: "0.25",
  autoEscalateFlagged: false,
};

export function SettingsForm() {
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  const onSubmit = async (values: SettingsValues) => {
    setSubmitting(true);
    // Demo-only — wire to a real persistence endpoint when you add one.
    await new Promise((r) => setTimeout(r, 400));
    setSubmitting(false);
    toast.success("Moderation defaults saved", {
      description: `Threshold ${values.defaultThreshold}, sampling "${values.defaultSampleMode}"`,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader className="border-b border-border py-4 px-5">
            <CardTitle className="card-title">Moderation defaults</CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <FormField
              control={form.control}
              name="defaultSampleMode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default sampling</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-60">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="fps-1">1 fps</SelectItem>
                      <SelectItem value="fps-0.5">Every 2 seconds</SelectItem>
                      <SelectItem value="keyframes">Keyframes only</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Frame-sampling density applied to new scans by default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="defaultThreshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Default detection threshold</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={1}
                      step={0.05}
                      className="w-32 font-mono tabular-nums"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Between 0 and 1. Recommended starting point: 0.25.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="autoEscalateFlagged"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Auto-escalate flagged videos</FormLabel>
                    <FormDescription>
                      Mark any video with at least one flagged frame as Escalated.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <DangerZone />

        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset(defaultValues)}
          >
            Reset
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
