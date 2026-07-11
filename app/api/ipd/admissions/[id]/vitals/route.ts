import { NextRequest } from "next/server";
import { wrapAuthRoute } from "@/modules/auth/services/auth-helper";
import { RequestContextService } from "@/lib/services/request-context-service";
import { requirePermission } from "@/permissions";
import { prisma } from "@/lib/prisma";

export const POST = wrapAuthRoute(async (req: NextRequest, context: Record<string, unknown>) => {
  const reqContext = RequestContextService.getRequired();
  await requirePermission(reqContext.employee.id, "IPD", "View");

  const { id } = await (context.params as Promise<{ id: string }>);
  const body = await req.json();

  const temp = body.temperature ? Number(body.temperature) : null;
  const pulse = body.pulse ? Number(body.pulse) : null;
  const sys = body.systolicBP ? Number(body.systolicBP) : null;
  const dia = body.diastolicBP ? Number(body.diastolicBP) : null;
  const spo2 = body.spo2 ? Number(body.spo2) : null;
  const rr = body.respiratoryRate ? Number(body.respiratoryRate) : null;
  const wt = body.weight ? Number(body.weight) : null;
  const ht = body.height ? Number(body.height) : null;
  const bs = body.bloodSugar ? Number(body.bloodSugar) : null;

  const vitals = await prisma.iPDVitals.create({
    data: {
      ipdAdmissionId: id,
      temperature: temp,
      pulse: pulse,
      systolicBP: sys,
      diastolicBP: dia,
      spo2: spo2,
      respiratoryRate: rr,
      weight: wt,
      height: ht,
      bloodSugar: bs,
      recordedBy: reqContext.employee.name,
    },
  });

  // Construct timeline description
  const parts = [];
  if (temp) parts.push(`Temp: ${temp}°F`);
  if (pulse) parts.push(`Pulse: ${pulse} bpm`);
  if (sys && dia) parts.push(`BP: ${sys}/${dia} mmHg`);
  if (spo2) parts.push(`SpO2: ${spo2}%`);

  await prisma.iPDTimelineEvent.create({
    data: {
      ipdAdmissionId: id,
      eventType: "VITALS",
      description: `Vitals recorded: ${parts.length > 0 ? parts.join(", ") : "Recorded empty profile"}`,
      recordedBy: reqContext.employee.name,
    },
  });

  return vitals;
});
