// Purpose: Schema validate input API truoc khi controller xu ly nghiep vu.
const { z } = require('zod');
const {
  MAX_PRICE,
  MAX_SEATS_PER_EVENT,
  MAX_ZONES,
  nonEmptyTrimmedString,
} = require('./common.validator');

const safeClientId = (field) =>
  z
    .string({ message: `${field} phải là chuỗi` })
    .trim()
    .min(1, `${field} là bắt buộc`)
    .max(120, `${field} tối đa 120 ký tự`)
    .regex(/^[A-Za-z0-9_.:-]+$/, `${field} chứa ký tự không hợp lệ`);

const seatSchema = z.object({
  id: safeClientId('ID ghế').optional(),
  label: nonEmptyTrimmedString('Nhãn ghế', 1, 20),
  row: z.coerce.number().int().min(0).max(999),
  col: z.coerce.number().int().min(0).max(999),
}).passthrough();

const zoneConfigSchema = z.object({
  rows: z.coerce.number().int().min(1).max(200).optional(),
  cols: z.coerce.number().int().min(1).max(200).optional(),
  tableCount: z.coerce.number().int().min(1).max(500).optional(),
  seatsPerTable: z.coerce.number().int().min(1).max(20).optional(),
  baseSeats: z.coerce.number().int().min(1).max(200).optional(),
  seatsPerRow: z.string().trim().max(500).optional(),
}).passthrough().optional();

const zoneSchema = z.object({
  id: safeClientId('ID khu vực'),
  name: nonEmptyTrimmedString('Tên khu vực', 1, 80),
  price: z.coerce.number({ message: 'Giá vé phải là số' }).positive('Giá vé phải > 0').max(MAX_PRICE, `Giá vé tối đa ${MAX_PRICE}`),
  rows: z.coerce.number().int().min(1).max(200).optional(),
  cols: z.coerce.number().int().min(1).max(200).optional(),
  config: zoneConfigSchema,
  seats: z.array(seatSchema).min(1, 'Mỗi khu vực phải có ít nhất 1 ghế'),
}).passthrough();

const seatmapSchema = z.object({
  zones: z.array(zoneSchema).min(1, 'Cần ít nhất 1 khu vực').max(MAX_ZONES, `Tối đa ${MAX_ZONES} khu vực`),
}).passthrough().superRefine((seatmap, ctx) => {
  const zoneIds = new Set();
  let totalSeats = 0;

  seatmap.zones.forEach((zone, zoneIndex) => {
    if (zoneIds.has(zone.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['zones', zoneIndex, 'id'],
        message: 'ID khu vực bị trùng',
      });
    }
    zoneIds.add(zone.id);

    totalSeats += zone.seats.length;
    const seatIds = new Set();
    const labels = new Set();
    const positions = new Set();

    zone.seats.forEach((seat, seatIndex) => {
      if (seat.id) {
        if (seatIds.has(seat.id)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['zones', zoneIndex, 'seats', seatIndex, 'id'],
            message: 'ID ghế bị trùng trong khu vực',
          });
        }
        seatIds.add(seat.id);
      }

      const label = seat.label.toLowerCase();
      if (labels.has(label)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zones', zoneIndex, 'seats', seatIndex, 'label'],
          message: 'Nhãn ghế bị trùng trong khu vực',
        });
      }
      labels.add(label);

      const position = `${seat.row}:${seat.col}`;
      if (positions.has(position)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['zones', zoneIndex, 'seats', seatIndex],
          message: 'Vị trí hàng/cột bị trùng trong khu vực',
        });
      }
      positions.add(position);
    });
  });

  if (totalSeats > MAX_SEATS_PER_EVENT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['zones'],
      message: `Tổng số ghế tối đa là ${MAX_SEATS_PER_EVENT}`,
    });
  }
});

const saveSeatmapBody = z.object({
  seatmapVersion: z.coerce.number().int().min(0, 'seatmapVersion không hợp lệ'),
  seatmap: seatmapSchema,
}).strict();

module.exports = {
  saveSeatmapBody,
};
