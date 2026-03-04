import React from "react";
import { useFormContext } from "react-hook-form";
import { getPatients } from "@/services/patients";
import { FormLabel } from "@/components/ui/form";
import { CreatableAsyncCombobox } from "@/components/shared/creatable-async-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import type { Patient } from "@/types";

interface InvoicePatientInfoProps {
  voucherTypes: any[];
  selectedPatient: Patient | null;
  setSelectedPatient: (patient: Patient | null) => void;
}

export function InvoicePatientInfo({
  voucherTypes,
  selectedPatient,
  setSelectedPatient,
}: InvoicePatientInfoProps) {
  const {
    control,
    setValue,
    formState: { errors },
    clearErrors,
  } = useFormContext();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
      <div className="relative z-20 space-y-2">
        <FormLabel>Paciente *</FormLabel>
        <div className="mt-1">
          <CreatableAsyncCombobox
            value={selectedPatient?.id || null}
            onChange={(val: string | number | null, patient?: Patient) => {
              if (patient) {
                setSelectedPatient(patient);
                setValue("patient_id", patient.id);
                clearErrors("patient_id");
              } else {
                setSelectedPatient(null);
                setValue("patient_id", 0);
              }
            }}
            fetchFn={async (search: string) => {
              const res = await getPatients({ search, cantidad: 10 });
              return res.data;
            }}
            placeholder="Buscar o seleccionar paciente..."
            searchPlaceholder="Buscar por nombre, apellido o DNI..."
            selectedLabel={
              selectedPatient
                ? `${selectedPatient.first_name} ${selectedPatient.last_name}${selectedPatient.cuit ? ` | DNI: ${selectedPatient.cuit}` : ""}`
                : undefined
            }
            queryKey="invoice-patient-search"
          />
        </div>
        {errors.patient_id && (
          <p className="text-[0.8rem] font-medium text-danger mt-1">
            {errors.patient_id.message as string}
          </p>
        )}
      </div>

      <FormField
        control={control}
        name="voucher_type_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Tipo de Comprobante *</FormLabel>
            <Select
              onValueChange={(val) => field.onChange(parseInt(val))}
              value={field.value > 0 ? field.value.toString() : ""}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {voucherTypes?.map((vt) => (
                  <SelectItem key={vt.id} value={vt.id.toString()}>
                    {vt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
