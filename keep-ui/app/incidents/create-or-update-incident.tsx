"use client";

import {
  TextInput,
  Textarea,
  Divider,
  Subtitle,
  Text,
  Button,
  Select,
  SelectItem,
} from "@tremor/react";
import { useSession } from "next-auth/react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getApiURL } from "utils/apiUrl";
import { IncidentDto } from "./models";
import { useIncidents } from "utils/hooks/useIncidents";
import { Session } from "next-auth";
import { useUsers } from "utils/hooks/useUsers";

interface Props {
  incidentToEdit: IncidentDto | null;
  createCallback?: (id: string) => void;
  exitCallback?: () => void;
}

export const updateIncidentRequest = async (
  session: Session | null,
  incidentId: string,
  incidentName: string,
  incidentUserSummary: string,
  incidentAssignee: string
) => {
  const apiUrl = getApiURL();
  const response = await fetch(`${apiUrl}/incidents/${incidentId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${session?.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_generated_name: incidentName,
      user_summary: incidentUserSummary,
      assignee: incidentAssignee,
    }),
  });
  return response;
};

export default function CreateOrUpdateIncident({
  incidentToEdit,
  createCallback,
  exitCallback,
}: Props) {
  const { data: session } = useSession();
  const { mutate } = useIncidents(true, 20);
  const [incidentName, setIncidentName] = useState<string>("");
  const [incidentUserSummary, setIncidentUserSummary] = useState<string>("");
  const [incidentAssignee, setIncidentAssignee] = useState<string>("");
  const { data: users = [] } = useUsers();
  const editMode = incidentToEdit !== null;

  // Display cancel btn if editing or we need to cancel for another reason (eg. going one step back in the modal etc.)
  const cancellable = editMode || exitCallback;

  useEffect(() => {
    if (incidentToEdit) {
      setIncidentName(
        incidentToEdit.user_generated_name ??
          incidentToEdit.ai_generated_name ??
          ""
      );
      setIncidentUserSummary(
        incidentToEdit.user_summary ?? incidentToEdit.generated_summary ?? ""
      );
      setIncidentAssignee(incidentToEdit.assignee ?? "");
    }
  }, [incidentToEdit]);

  const clearForm = () => {
    setIncidentName("");
    setIncidentUserSummary("");
    setIncidentAssignee("");
  };

  const addIncident = async (e: FormEvent) => {
    e.preventDefault();
    const apiUrl = getApiURL();
    const response = await fetch(`${apiUrl}/incidents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_generated_name: incidentName,
        user_summary: incidentUserSummary,
        assignee: incidentAssignee,
      }),
    });
    if (response.ok) {
      exitEditMode();
      await mutate();
      toast.success("Incident created successfully");

      const created = await response.json();
      createCallback?.(created.id); // close the modal and associate the alert incident
    } else {
      toast.error(
        "Failed to create incident, please contact us if this issue persists."
      );
    }
  };

  // This is the function that will be called on submitting the form in the editMode, it sends a PUT request to the backend.
  const updateIncident = async (e: FormEvent) => {
    e.preventDefault();
    const response = await updateIncidentRequest(
      session,
      incidentToEdit?.id!,
      incidentName,
      incidentUserSummary,
      incidentAssignee
    );
    if (response.ok) {
      exitEditMode();
      await mutate();
      toast.success("Incident updated successfully");
    } else {
      toast.error(
        "Failed to update incident, please contact us if this issue persists."
      );
    }
  };

  // If the Incident is successfully updated or the user cancels the update we exit the editMode and set the editRule in the incident.tsx to null.
  const exitEditMode = () => {
    exitCallback?.();
    clearForm();
  };

  const submitEnabled = (): boolean => {
    return !!incidentName;
  };

  return (
    <form className="py-2" onSubmit={editMode ? updateIncident : addIncident}>
      <Subtitle>Incident Metadata</Subtitle>
      <div className="mt-2.5">
        <Text className="mb-2">
          Name<span className="text-red-500 text-xs">*</span>
        </Text>
        <TextInput
          placeholder="Incident Name"
          required={true}
          value={incidentName}
          onValueChange={setIncidentName}
        />
      </div>
      <div className="mt-2.5">
        <Text className="mb-2">Summary</Text>
        <Textarea
          placeholder="What happened?"
          required={false}
          value={incidentUserSummary}
          onValueChange={setIncidentUserSummary}
        />
      </div>

      <div className="mt-2.5">
        <Text className="mb-2">Assignee</Text>
        {users.length > 0 ? (
          <Select
            placeholder="Who is responsible"
            value={incidentAssignee}
            onValueChange={setIncidentAssignee}
          >
            {users.map((user) => (
              <SelectItem key={user.email} value={user.email}>
                {user.name || user.email}
              </SelectItem>
            ))}
          </Select>
        ) : (
          <TextInput
            placeholder="Who is responsible"
            value={incidentAssignee}
            onValueChange={setIncidentAssignee}
          />
        )}
      </div>

      <Divider />

      <div className="mt-auto pt-6 space-x-1 flex flex-row justify-end items-center">
        {cancellable && (
          <Button
            color="orange"
            size="xs"
            variant="secondary"
            onClick={exitEditMode}
          >
            Cancel
          </Button>
        )}
        <Button
          disabled={!submitEnabled()}
          color="orange"
          size="xs"
          type="submit"
        >
          {editMode ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
