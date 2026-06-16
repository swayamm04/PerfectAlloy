"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import { DashboardLayout } from "@/src/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import Link from "next/link";
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Loader2, 
  ShieldCheck,
  ArrowLeft,
  Save,
  Info
} from "lucide-react";
import { API_URL } from "@/src/lib/api";
import { cn } from "@/lib/utils";

interface FieldData {
  _id?: string;
  label: string;
  value: string;
}

interface MachineData {
  _id: string;
  name: string;
  description: string;
  fields: FieldData[];
  createdAt?: string;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

const AutocompleteInput = ({ value, onChange, suggestions, placeholder, className }: AutocompleteInputProps) => {
  const [show, setShow] = useState(false);
  const [filtered, setFiltered] = useState<string[]>([]);
  
  useEffect(() => {
    if (!value) {
      setFiltered(suggestions);
    } else {
      setFiltered(
        suggestions.filter(
          s => s.toLowerCase().includes(value.toLowerCase()) && 
          s.toLowerCase() !== value.toLowerCase()
        )
      );
    }
  }, [value, suggestions]);

  return (
    <div className="relative w-full">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShow(true);
        }}
        onFocus={() => setShow(true)}
        onBlur={() => {
          // Small timeout so onMouseDown triggers before dropdown disappears
          setTimeout(() => setShow(false), 200);
        }}
        placeholder={placeholder}
        className={className}
      />
      {show && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-popover text-popover-foreground rounded-md border border-muted shadow-lg max-h-60 overflow-y-auto animate-in fade-in-5 duration-100">
          {filtered.map((s, index) => (
            <li
              key={index}
              onMouseDown={() => {
                onChange(s);
                setShow(false);
              }}
              className="cursor-pointer select-none px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors font-medium"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function MachineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  
  const [machine, setMachine] = useState<MachineData | null>(null);
  const [fields, setFields] = useState<FieldData[]>([]);
  const [initialFields, setInitialFields] = useState<FieldData[]>([]);
  const [uniqueLabels, setUniqueLabels] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const machineId = params.id as string;

  const fetchMachineDetails = async () => {
    try {
      const response = await fetch(`${API_URL}/api/machines/${machineId}`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setMachine(data);
        setFields(data.fields || []);
        setInitialFields(data.fields || []);
      } else {
        toast.error(data.message || "Failed to fetch machine details");
        router.push("/machines");
      }
    } catch (error) {
      console.error("Error fetching machine details:", error);
      toast.error("An error occurred while loading machine details");
      router.push("/machines");
    }
  };

  const fetchUniqueLabels = async () => {
    try {
      const response = await fetch(`${API_URL}/api/machines/unique-labels`, {
        headers: {
          Authorization: `Bearer ${currentUser?.token}`,
        },
      });
      const data = await response.json();
      if (response.ok) {
        setUniqueLabels(data);
      }
    } catch (error) {
      console.error("Error fetching unique labels:", error);
    }
  };

  useEffect(() => {
    if (currentUser?.role === "super-admin" && machineId) {
      setLoading(true);
      Promise.all([fetchMachineDetails(), fetchUniqueLabels()]).finally(() => {
        setLoading(false);
      });
    }
  }, [currentUser, machineId]);

  const handleAddField = () => {
    setFields([...fields, { label: "", value: "" }]);
  };

  const handleRemoveField = (index: number) => {
    const newFields = fields.filter((_, idx) => idx !== index);
    setFields(newFields);
  };

  const handleFieldChange = (index: number, key: keyof FieldData, val: string) => {
    const newFields = [...fields];
    newFields[index] = {
      ...newFields[index],
      [key]: val
    };
    setFields(newFields);
  };

  const handleSaveFields = async () => {
    // Validate fields
    const hasEmptyField = fields.some(f => !f.label.trim() || !f.value.trim());
    if (hasEmptyField) {
      toast.error("Please fill in both the label and value for all fields.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/machines/${machineId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${currentUser?.token}`,
        },
        body: JSON.stringify({ fields }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Machine fields saved successfully!");
        setMachine(data);
        setFields(data.fields || []);
        setInitialFields(data.fields || []);
        // Refresh the labels in case a new label was entered
        fetchUniqueLabels();
      } else {
        toast.error(data.message || "Failed to save fields");
      }
    } catch (error) {
      console.error("Error saving machine fields:", error);
      toast.error("An error occurred while saving fields");
    } finally {
      setSaving(false);
    }
  };

  const isModified = JSON.stringify(fields) !== JSON.stringify(initialFields);
  const hasEmptyField = fields.some(f => !f.label.trim() || !f.value.trim());

  if (currentUser?.role !== "super-admin") {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] flex-col items-center justify-center space-y-4">
          <ShieldCheck className="h-20 w-20 text-destructive opacity-10" />
          <h1 className="text-3xl font-bold tracking-tight">Access Denied</h1>
          <p className="text-muted-foreground text-lg">Only Super Admins can manage machine fields.</p>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!machine) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        {/* Back and Page Header */}
        <div className="flex flex-col gap-4">
          <Link href="/machines">
            <Button variant="ghost" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Machines
            </Button>
          </Link>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Cpu className="h-8 w-8 text-primary" />
                {machine.name}
              </h1>
              {machine.description ? (
                <p className="text-muted-foreground mt-1">{machine.description}</p>
              ) : (
                <p className="text-muted-foreground italic mt-1">No description provided</p>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleAddField}
                variant="outline"
                className="gap-2 h-11 px-5 font-semibold"
              >
                <Plus className="h-4 w-4" />
                Add Field
              </Button>
              <Button
                onClick={handleSaveFields}
                disabled={!isModified || hasEmptyField || saving}
                className="gap-2 h-11 px-6 font-semibold shadow-lg"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          </div>
        </div>

        {/* Dynamic Fields List Card */}
        <Card className="border-none shadow-xl bg-card/50 backdrop-blur-sm overflow-hidden">
          <CardHeader className="border-b bg-muted/30 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              Machine Properties & Attributes
            </CardTitle>
            <CardDescription>
              Configure custom key-value pairs for this machine. Suggestions will appear while typing previously used labels.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {fields.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-muted/10 rounded-xl border-2 border-dashed">
                <Cpu className="h-10 w-10 text-muted-foreground/40" />
                <h3 className="font-semibold text-muted-foreground">No Custom Fields</h3>
                <p className="text-sm text-muted-foreground/85 max-w-sm">
                  This machine has no dynamic fields yet. Click the "Add Field" button at the top to configure custom attributes.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-w-4xl">
                {fields.map((field, index) => (
                  <div 
                    key={index} 
                    className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 items-center bg-muted/20 p-4 rounded-xl border border-primary/5 shadow-sm animate-in slide-in-from-top-2 duration-200"
                  >
                    <div className="md:col-span-5 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground pl-1">Label / Attribute</Label>
                      <AutocompleteInput
                        value={field.label}
                        onChange={(val) => handleFieldChange(index, "label", val)}
                        suggestions={uniqueLabels}
                        placeholder="e.g. Serial Number, IP Address, Model"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="md:col-span-6 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground pl-1">Value</Label>
                      <Input
                        value={field.value}
                        onChange={(e) => handleFieldChange(index, "value", e.target.value)}
                        placeholder="e.g. SN-9023, 10.0.0.5, CNC-2026"
                        className="h-10 bg-background"
                      />
                    </div>
                    <div className="md:col-span-1 flex justify-end md:justify-center items-end mt-4 md:mt-6">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 h-10 w-10 transition-colors"
                        onClick={() => handleRemoveField(index)}
                        title="Remove Field"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
