"use client";

import { useEffect, useState } from "react";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Input, Select } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { canManageAdmins } from "@/lib/permissions";
import { listAllUsers, searchUsersByEmail } from "@/services/users";
import { setUserRole, setUserActive } from "@/services/callables";
import { useToast } from "@/components/ui/Toast";
import { toFriendlyError } from "@/lib/errors";
import type { UserProfile, UserRole } from "@/types/firestore";

export default function AdminUsersPage() {
  const { role: myRole } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [search, setSearch] = useState("");
  const { show } = useToast();
  const canManage = canManageAdmins(myRole);

  async function load() {
    setUsers(search ? await searchUsersByEmail(search) : await listAllUsers());
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const columns: Column<UserProfile>[] = [
    { header: "Name", key: "name", render: (u) => u.fullName },
    { header: "Email", key: "email", render: (u) => u.email },
    { header: "Phone", key: "phone", render: (u) => u.phoneNumber },
    {
      header: "Role",
      key: "role",
      render: (u) =>
        canManage ? (
          <Select
            value={u.role}
            onChange={async (e) => {
              try {
                await setUserRole({ userId: u.id, role: e.target.value as UserRole });
                show("success", `${u.fullName} is now ${e.target.value.replace("_", " ")}.`);
                load();
              } catch (err) {
                show("error", toFriendlyError(err));
              }
            }}
            className="w-40"
          >
            <option value="participant">Participant</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </Select>
        ) : (
          <Badge tone="neutral">{u.role.replace("_", " ")}</Badge>
        ),
    },
    {
      header: "Status",
      key: "status",
      render: (u) => <Badge tone={u.isActive ? "success" : "error"}>{u.isActive ? "Active" : "Deactivated"}</Badge>,
    },
    {
      header: "",
      key: "actions",
      className: "text-right",
      render: (u) =>
        canManage ? (
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                await setUserActive({ userId: u.id, isActive: !u.isActive });
                show("success", u.isActive ? "User deactivated." : "User reactivated.");
                load();
              } catch (err) {
                show("error", toFriendlyError(err));
              }
            }}
          >
            {u.isActive ? "Deactivate" : "Reactivate"}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="max-sm:max-w-89">
      <h1 className="text-2xl font-semibold text-neutral-900">Users</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {canManage ? "Manage roles and account status." : "Only super admins can change roles or deactivate accounts."}
      </p>
      <div className="mt-6 w-72">
        <Input placeholder="Search by email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mt-4">
        <DataTable columns={columns} rows={users ?? []} rowKey={(u) => u.id} loading={users === null} emptyTitle="No users found" />
      </div>
    </div>
  );
}
