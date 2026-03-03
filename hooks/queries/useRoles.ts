import { useQuery } from "@tanstack/react-query";
import { getRoles } from "@/services/roles";
import { z } from "zod";
import { RoleSchema } from "@/lib/schemas/user";

export function useRoles() {
  return useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const response = await getRoles();
      return z.array(RoleSchema).parse(response);
    },
  });
}
