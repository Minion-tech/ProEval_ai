"use client";

import { type ChangeEvent, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminService, type BulkStudent, type RegisteredStudent } from "@/lib/admin-service";

interface WhitelistStudentRow {
  id?: string;
  name: string;
  email?: string | null;
  enrollment_no: string;
  programme: "BTECH" | "MTECH" | "MCA" | "PHD";
  department: string;
  batch: string;
  is_registered?: boolean;
}

type SortKey = "name" | "programme" | "batch" | "department";

const programmeLabels: Record<WhitelistStudentRow["programme"], string> = {
  BTECH: "B.Tech",
  MTECH: "M.Tech",
  MCA: "MCA",
  PHD: "PhD",
};

const emptyWhitelistForm: BulkStudent = {
  name: "",
  enrollment_no: "",
  programme: "BTECH",
  department: "CSE",
  batch: "",
};

export default function AdminUsersPage() {
  const [registeredStudents, setRegisteredStudents] = useState<RegisteredStudent[]>([]);
  const [whitelistStudents, setWhitelistStudents] = useState<WhitelistStudentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingStudent, setIsSavingStudent] = useState(false);
  const [isUploadingStudentList, setIsUploadingStudentList] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [studentForm, setStudentForm] = useState<BulkStudent>(emptyWhitelistForm);
  const [studentProgrammeFilter, setStudentProgrammeFilter] = useState<string>("all");
  const [studentDepartmentFilter, setStudentDepartmentFilter] = useState<string>("all");
  const [studentSearch, setStudentSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const loadAdminUsers = async () => {
    setIsLoading(true);
    setError("");

    try {
      const [registeredResponse, whitelistResponse] = await Promise.all([
        adminService.getStudentUsers(),
        adminService.getStudentWhitelist(),
      ]);

      setRegisteredStudents(registeredResponse.data);
      setWhitelistStudents(whitelistResponse.data as WhitelistStudentRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load admin user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadAdminUsers();
  }, []);

  const registeredWhitelistCount = useMemo(
    () => whitelistStudents.filter((student) => student.is_registered).length,
    [whitelistStudents]
  );

  const programmeOptions = useMemo(
    () => Array.from(new Set(whitelistStudents.map((item) => item.programme))).sort(),
    [whitelistStudents]
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set(whitelistStudents.map((item) => item.department))).sort(),
    [whitelistStudents]
  );

  const filteredWhitelistStudents = useMemo(() => {
    const rows = whitelistStudents.filter((item) => {
      const matchesProgramme = studentProgrammeFilter === "all" || item.programme === studentProgrammeFilter;
      const matchesDepartment = studentDepartmentFilter === "all" || item.department === studentDepartmentFilter;
      const search = studentSearch.trim().toLowerCase();
      const matchesSearch =
        search.length === 0 ||
        item.name.toLowerCase().includes(search) ||
        (item.email || "").toLowerCase().includes(search) ||
        item.enrollment_no.toLowerCase().includes(search);

      return matchesProgramme && matchesDepartment && matchesSearch;
    });

    return [...rows].sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "programme") {
        return a.programme.localeCompare(b.programme);
      }
      if (sortBy === "batch") {
        return a.batch.localeCompare(b.batch);
      }
      return a.department.localeCompare(b.department);
    });
  }, [sortBy, studentDepartmentFilter, studentProgrammeFilter, studentSearch, whitelistStudents]);

  const handleAddWhitelistStudent = async () => {
    if (
      !studentForm.name.trim() ||
      !studentForm.enrollment_no.trim() ||
      !studentForm.department.trim() ||
      !studentForm.batch.trim()
    ) {
      setError("Student name, enrollment, programme, department, and batch are required.");
      return;
    }

    setIsSavingStudent(true);
    setError("");
    setSuccessMessage("");

    try {
      await adminService.uploadStudents([
        {
          ...studentForm,
          name: studentForm.name.trim(),
          enrollment_no: studentForm.enrollment_no.trim(),
          department: studentForm.department.trim(),
          batch: studentForm.batch.trim(),
        },
      ]);

      setStudentForm(emptyWhitelistForm);
      setSuccessMessage("Student added.");
      await loadAdminUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to add student.");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const parseStudentCsv = (csvText: string): BulkStudent[] => {
    const rows = csvText
      .split(/\r?\n/)
      .map((row) => row.trim())
      .filter(Boolean);

    if (rows.length < 2) {
      throw new Error("CSV must include a header row and at least one student row.");
    }

    const parseRow = (row: string) => {
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let index = 0; index < row.length; index += 1) {
        const char = row[index];
        const nextChar = row[index + 1];

        if (char === '"' && nextChar === '"') {
          current += '"';
          index += 1;
        } else if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      values.push(current.trim());
      return values;
    };

    const headers = parseRow(rows[0]).map((header) => header.toLowerCase());
    const requiredHeaders = ["name", "enrollment_no", "programme", "department", "batch"];
    const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header));

    if (missingHeaders.length > 0) {
      throw new Error(`CSV is missing columns: ${missingHeaders.join(", ")}.`);
    }

    return rows.slice(1).map((row, rowIndex) => {
      const values = parseRow(row);
      const getValue = (header: string) => values[headers.indexOf(header)]?.trim() || "";
      const programme = getValue("programme").toUpperCase() as BulkStudent["programme"];

      if (!["BTECH", "MTECH", "MCA", "PHD"].includes(programme)) {
        throw new Error(`Row ${rowIndex + 2} has an invalid programme. Use BTECH, MTECH, MCA, or PHD.`);
      }

      const student: BulkStudent = {
        name: getValue("name"),
        enrollment_no: getValue("enrollment_no"),
        programme,
        department: getValue("department"),
        batch: getValue("batch"),
      };

      if (
        !student.name ||
        !student.enrollment_no ||
        !student.department ||
        !student.batch
      ) {
        throw new Error(`Row ${rowIndex + 2} is missing required student data.`);
      }

      return student;
    });
  };

  const handleUploadStudentList = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setIsUploadingStudentList(true);
    setError("");
    setSuccessMessage("");

    try {
      const students = parseStudentCsv(await file.text());
      await adminService.uploadStudents(students);
      setSuccessMessage(`Uploaded ${students.length} student${students.length === 1 ? "" : "s"}.`);
      await loadAdminUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload student list.");
    } finally {
      setIsUploadingStudentList(false);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8 md:px-6 md:py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Registry</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registered students and university enrollment records are managed here by the Project Coordinator.
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}
        {successMessage ? (
          <div className="rounded-md border px-4 py-3 text-sm text-muted-foreground">{successMessage}</div>
        ) : null}

        <div className="space-y-6">
          <Tabs defaultValue="whitelist" className="space-y-4">
            <TabsList>
              <TabsTrigger value="whitelist">Add Students</TabsTrigger>
              <TabsTrigger value="registered">Registered Students</TabsTrigger>
            </TabsList>

            <TabsContent value="registered" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Registered Students</CardTitle>
                  <CardDescription>
                    Student accounts created through the student registration flow.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="border-b text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 font-medium">Enrollment No</th>
                          <th className="px-2 py-2 font-medium">Name</th>
                          <th className="px-2 py-2 font-medium">Email</th>
                          <th className="px-2 py-2 font-medium">Programme</th>
                          <th className="px-2 py-2 font-medium">Department</th>
                          <th className="px-2 py-2 font-medium">Batch</th>
                          <th className="px-2 py-2 font-medium">Verification</th>
                          <th className="px-2 py-2 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registeredStudents.length > 0 ? (
                          registeredStudents.map((student) => (
                            <tr key={student.id} className="border-b last:border-0">
                              <td className="px-2 py-3">{student.enrollment_no}</td>
                              <td className="px-2 py-3">{student.name}</td>
                              <td className="px-2 py-3">{student.email}</td>
                              <td className="px-2 py-3">{programmeLabels[student.programme]}</td>
                              <td className="px-2 py-3">{student.department}</td>
                              <td className="px-2 py-3">{student.batch}</td>
                              <td className="px-2 py-3">
                                <Badge variant={student.is_verified ? "outline" : "secondary"}>
                                  {student.is_verified ? "Verified" : "Pending"}
                                </Badge>
                              </td>
                              <td className="px-2 py-3">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={async () => {
                                    const ok = confirm(`Delete student ${student.name} and all related data?`);
                                    if (!ok) return;
                                    try {
                                      await adminService.deleteStudent(student.id);
                                      await loadAdminUsers();
                                    } catch (err) {
                                      setError(err instanceof Error ? err.message : "Unable to delete student.");
                                    }
                                  }}
                                >
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">
                              {isLoading ? "Loading registered students..." : "No registered students found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="whitelist" className="space-y-6">
              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardDescription>Total Added</CardDescription>
                    <CardTitle className="text-3xl">{isLoading ? "-" : whitelistStudents.length}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Registered</CardDescription>
                    <CardTitle className="text-3xl">{isLoading ? "-" : registeredWhitelistCount}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardDescription>Pending Registration</CardDescription>
                    <CardTitle className="text-3xl">
                      {isLoading ? "-" : whitelistStudents.length - registeredWhitelistCount}
                    </CardTitle>
                  </CardHeader>
                </Card>
              </section>

              <Card>
                <CardHeader>
                  <CardTitle>Add Students</CardTitle>
                  <CardDescription>
                    Add university enrollment records manually or by CSV. Email, team ID, and team leader are collected later through registration and project creation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-col gap-2 rounded-md border border-dashed p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-medium">Upload Student List</p>
                      <p className="text-xs text-muted-foreground">
                        CSV columns: name, enrollment_no, programme, department, batch.
                      </p>
                    </div>
                    <div>
                      <input
                        id="studentListUpload"
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={handleUploadStudentList}
                        disabled={isUploadingStudentList}
                      />
                      <Button variant="outline" asChild disabled={isUploadingStudentList}>
                        <label htmlFor="studentListUpload">
                          {isUploadingStudentList ? "Uploading..." : "Upload Student List"}
                        </label>
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="studentName">Name</Label>
                      <Input
                        id="studentName"
                        placeholder="Student name"
                        value={studentForm.name}
                        onChange={(event) => setStudentForm((prev) => ({ ...prev, name: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentEnrollment">Enrollment No</Label>
                      <Input
                        id="studentEnrollment"
                        placeholder="LEAD001"
                        value={studentForm.enrollment_no}
                        onChange={(event) =>
                          setStudentForm((prev) => ({ ...prev, enrollment_no: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Programme</Label>
                      <Select
                        value={studentForm.programme}
                        onValueChange={(value) =>
                          setStudentForm((prev) => ({ ...prev, programme: value as BulkStudent["programme"] }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select programme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTECH">B.Tech</SelectItem>
                          <SelectItem value="MTECH">M.Tech</SelectItem>
                          <SelectItem value="MCA">MCA</SelectItem>
                          <SelectItem value="PHD">PhD</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentDepartment">Department</Label>
                      <Input
                        id="studentDepartment"
                        placeholder="CSE"
                        value={studentForm.department}
                        onChange={(event) =>
                          setStudentForm((prev) => ({ ...prev, department: event.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentBatch">Batch</Label>
                      <Input
                        id="studentBatch"
                        placeholder="2024-2028"
                        value={studentForm.batch}
                        onChange={(event) => setStudentForm((prev) => ({ ...prev, batch: event.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleAddWhitelistStudent} disabled={isSavingStudent}>
                      {isSavingStudent ? "Adding..." : "Add Student"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Added Students</CardTitle>
                  <CardDescription>
                    University enrollment records used only for signup validation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2 xl:col-span-2">
                      <Label htmlFor="studentSearch">Search</Label>
                      <Input
                        id="studentSearch"
                        placeholder="Name or enrollment"
                        value={studentSearch}
                        onChange={(event) => setStudentSearch(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Programme</Label>
                      <Select value={studentProgrammeFilter} onValueChange={setStudentProgrammeFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {programmeOptions.map((item) => (
                            <SelectItem key={item} value={item}>
                              {programmeLabels[item]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <Select value={studentDepartmentFilter} onValueChange={setStudentDepartmentFilter}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {departmentOptions.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sort By</Label>
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortKey)}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="name">Name</SelectItem>
                          <SelectItem value="programme">Programme</SelectItem>
                          <SelectItem value="batch">Batch</SelectItem>
                          <SelectItem value="department">Department</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                      <thead className="border-b text-muted-foreground">
                        <tr>
                          <th className="px-2 py-2 font-medium">Enrollment No</th>
                          <th className="px-2 py-2 font-medium">Name</th>
                          <th className="px-2 py-2 font-medium">Programme</th>
                          <th className="px-2 py-2 font-medium">Department</th>
                          <th className="px-2 py-2 font-medium">Batch</th>
                          <th className="px-2 py-2 font-medium">Registration</th>
                          <th className="px-2 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredWhitelistStudents.length > 0 ? (
                          filteredWhitelistStudents.map((item) => (
                            <tr key={item.id || item.enrollment_no} className="border-b last:border-0">
                              <td className="px-2 py-3">{item.enrollment_no}</td>
                              <td className="px-2 py-3">{item.name}</td>
                              <td className="px-2 py-3">{programmeLabels[item.programme]}</td>
                              <td className="px-2 py-3">{item.department}</td>
                              <td className="px-2 py-3">{item.batch}</td>
                              <td className="px-2 py-3">
                                <Badge variant={item.is_registered ? "outline" : "secondary"}>
                                  {item.is_registered ? "Registered" : "Not Registered"}
                                </Badge>
                              </td>
                              <td className="px-2 py-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={async () => {
                                    if (!item.id) return;
                                    const ok = confirm(`Remove ${item.name} from the pre-approved list?`);
                                    if (!ok) return;
                                    try {
                                      await adminService.deletePreapprovedStudent(item.id);
                                      await loadAdminUsers();
                                      setSuccessMessage(`Removed ${item.name} from whitelist.`);
                                    } catch (err) {
                                      setError(err instanceof Error ? err.message : "Unable to remove student.");
                                    }
                                  }}
                                >
                                  Remove
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-2 py-6 text-center text-muted-foreground">
                              {isLoading ? "Loading students..." : "No students found."}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
