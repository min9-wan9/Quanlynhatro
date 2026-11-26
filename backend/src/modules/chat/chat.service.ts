import {
  Content,
  FunctionDeclaration,
  GoogleGenerativeAI,
  Part,
  SchemaType,
} from '@google/generative-ai';
import prisma from '../../config/db';

export interface ChatHistoryItem {
  role?: string;
  text?: string;
  parts?: Array<{ text?: string }>;
}

export interface ChatUserContext {
  id?: string | undefined;
  name?: string | undefined;
  phone?: string | undefined;
  roomNumber?: string | undefined;
  role?: string | undefined;
}

export interface ChatReply {
  text: string;
  source: 'gemini' | 'fallback';
  model?: string | undefined;
}

const GEMINI_TIMEOUT_MS = 8000;

const DEFAULT_GEMINI_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.8-flash',
];

// 1. Định nghĩa các tools (Function Calling)
const checkAvailableRoomsDeclaration: FunctionDeclaration = {
  name: 'checkAvailableRooms',
  description: 'Tra cứu các phòng đang trống dựa trên khoảng giá tối đa (VNĐ)',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      maxPrice: {
        type: SchemaType.NUMBER,
        description: 'Giá phòng tối đa theo VNĐ mà khách có thể thuê (ví dụ: 3000000 cho 3 triệu)',
      },
    },
  },
};

const getInvoiceStatusDeclaration: FunctionDeclaration = {
  name: 'getInvoiceStatus',
  description: 'Tra cứu trạng thái hóa đơn của người thuê dựa vào số điện thoại',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tenantPhone: {
        type: SchemaType.STRING,
        description: 'Số điện thoại của người thuê',
      },
    },
    required: ['tenantPhone'],
  },
};

const createIssueReportDeclaration: FunctionDeclaration = {
  name: 'createIssueReport',
  description: 'Tạo báo cáo sự cố, hư hỏng phòng cho người thuê',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      roomNumber: { type: SchemaType.STRING, description: 'Số phòng bị sự cố (ví dụ: 101)' },
      description: { type: SchemaType.STRING, description: 'Mô tả chi tiết sự cố' },
      tenantPhone: { type: SchemaType.STRING, description: 'Số điện thoại của người báo cáo' },
    },
    required: ['roomNumber', 'description', 'tenantPhone'],
  },
};

const getRentalRulesDeclaration: FunctionDeclaration = {
  name: 'getRentalRules',
  description: 'Lấy thông tin nội quy, giờ giấc, quy định rác thải của nhà trọ',
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

const tools = [
  {
    functionDeclarations: [
      checkAvailableRoomsDeclaration,
      getInvoiceStatusDeclaration,
      createIssueReportDeclaration,
      getRentalRulesDeclaration,
    ],
  },
];

const qaKnowledgeBase = `
Dưới đây là bộ 20 câu hỏi thường gặp và cách trả lời tham khảo. Hãy dựa vào đây để trả lời câu hỏi của cư dân một cách tự nhiên và chính xác:

1. Biểu phí dịch vụ tính thế nào?
- Tiền điện 3.500đ/kWh (công tơ riêng từng phòng), Nước sinh hoạt 20.000đ/khối (hoặc 100.000đ/người/tháng nếu khoán), Phí dịch vụ chung 120.000đ/phòng/tháng (Wifi, rác, vệ sinh hành lang, camera), và Miễn phí gửi 02 xe máy tại tầng 1.

2. Hạn đóng tiền phòng hàng tháng là khi nào?
- Hóa đơn sẽ chốt chỉ số điện nước vào ngày 01 hàng tháng. Thời hạn thanh toán là từ ngày 01 đến hết ngày 05. Sau ngày 05 hệ thống sẽ tự động gửi thông báo nhắc hạn.

3. Xem chi tiết hóa đơn tháng này ở đâu?
- Vào mục 'Hóa đơn' trên thanh menu ứng dụng để xem chi tiết.

4. Cách chuyển khoản để hệ thống tự gạch nợ?
- Mở mục 'Hóa đơn' và quét trực tiếp mã VietQR trên màn hình. Hệ thống sẽ tự động gạch nợ sau 3-5 giây mà không cần gửi biên lai.

5. Xin gia hạn đóng tiền phòng trễ vài ngày
- Vào mục 'Hóa đơn', chọn 'Yêu cầu gia hạn' và chọn ngày cam kết đóng. Ban quản lý sẽ duyệt và không tính phí phạt trễ hạn.

6. Báo hỏng thiết bị vệ sinh, điện nước
- Vào mục 'Báo hỏng / Sự cố' trên app, chọn danh mục 'Điện nước' và bấm gửi yêu cầu.

7. Điều hòa không mát / chảy nước
- Gửi yêu cầu qua mục 'Báo hỏng thiết bị' trên app.

8. Kiểm tra tiến độ xử lý sửa chữa
- Kiểm tra trực tiếp tiến độ tại tab 'Lịch sử báo hỏng'. Thường thợ xử lý vào 17:00 - 18:30 hàng ngày.

9. Lịch bảo dưỡng và vệ sinh điều hòa định kỳ
- Bảo dưỡng định kỳ 6 tháng/lần (vào tháng 4 và tháng 10). BQL sẽ gửi thông báo trước.

10. Đăng ký thêm xe máy
- Mỗi phòng được miễn phí 02 xe máy. Từ xe thứ 3 trở đi phí gửi là 100.000đ/xe/tháng. Vào mục 'Quản lý xe' để đăng ký.

11. Bị mất thẻ xe / thẻ từ vào cổng
- Xuống phòng Quản lý tại tầng 1 (giờ hành chính 08:00 - 18:00) để báo hủy và làm thẻ mới. Phí là 50.000đ/thẻ.

12. Mạng Wifi tòa nhà bị chập chờn
- Tắt mở lại Wifi hoặc rút nguồn modem phụ cắm lại. Nếu không được, bấm 'Báo sự cố mạng' trên app.

13. Giờ giấc gom rác và chỗ vứt rác
- Rác sinh hoạt mang xuống thùng rác lớn góc nhà xe tầng 1. Xe môi trường gom từ 19:00 - 20:00. Không để ngoài hành lang.

14. Khiếu nại tiếng ồn hàng xóm
- Chọn mục 'Phản ánh nội quy' trên app để gửi cảnh báo ẩn danh, hoặc gọi bảo vệ trực đêm.

15. Khách hoặc người thân ở lại qua đêm
- Vào mục 'Đăng ký khách lưu trú' trên app và tải ảnh CCCD của khách trước 21h.

16. Quy định về nuôi thú cưng
- Cho phép nuôi thú cưng nhỏ dưới 5kg, đã tiêm phòng, giữ vệ sinh, không thả rông, không gây ồn sau 22h.

17. Giờ giấc ra vào ban đêm
- Tòa nhà mở cửa tự do 24/24. Cổng ngoài tự chốt an toàn sau 23h, dùng vân tay/thẻ từ mở và chú ý giữ im lặng.

18. Xem ngày hết hạn hợp đồng thuê
- Xem tại mục 'Thông tin hợp đồng' trên ứng dụng.

19. Đăng ký ký tiếp hợp đồng thuê
- Vào mục 'Hợp đồng' và bấm 'Yêu cầu gia hạn' trước khi hết hạn 15 ngày.

20. Thủ tục trả phòng và nhận lại tiền cọc
- Bấm 'Thông báo trả phòng' trên app trước ngày chuyển đi tối thiểu 30 ngày. Ban quản lý sẽ đặt lịch kiểm tra và hoàn cọc sau khi bàn giao nguyên vẹn.
`;

const qaMap = [
  {
    keywords: ['giá', 'phí', 'điện nước', 'tiền điện'],
    answer:
      'Tiền điện 3.500đ/kWh, nước 20.000đ/khối (hoặc khoán 100k/người), phí dịch vụ chung 120.000đ/phòng/tháng, và miễn phí 02 xe máy tại tầng 1.',
  },
  {
    keywords: ['hạn đóng', 'ngày nào đóng', 'hạn tiền'],
    answer:
      'Hóa đơn chốt ngày 01 hàng tháng. Thời hạn thanh toán là từ ngày 01 đến hết ngày 05 bạn nhé.',
  },
  {
    keywords: ['xem hóa đơn', 'bảng kê'],
    answer:
      'Bạn vào mục "Hóa đơn" trên thanh menu ứng dụng để xem chi tiết tiền phòng tháng này nhé.',
  },
  {
    keywords: ['chuyển khoản', 'gạch nợ'],
    answer:
      'Bạn mở mục "Hóa đơn" và quét mã VietQR trên màn hình. Hệ thống sẽ tự động gạch nợ sau 3-5 giây mà không cần gửi biên lai xác nhận.',
  },
  {
    keywords: ['trễ', 'muộn', 'gia hạn đóng'],
    answer:
      'Bạn có thể vào mục "Hóa đơn", chọn "Yêu cầu gia hạn" và chọn ngày cam kết đóng nhé. Ban quản lý sẽ duyệt và không tính phí phạt.',
  },
  {
    keywords: ['vòi nước', 'hỏng', 'thiết bị', 'vệ sinh', 'bồn cầu'],
    answer:
      'Bạn vui lòng vào mục "Báo hỏng / Sự cố" trên app, chọn danh mục tương ứng và gửi yêu cầu. Thợ sẽ liên hệ hỗ trợ bạn sớm nhất.',
  },
  {
    keywords: ['điều hòa', 'máy lạnh', 'không mát', 'chảy nước'],
    answer:
      'Bạn gửi yêu cầu qua mục "Báo hỏng / Sự cố" nhé. Ban quản lý sẽ xếp thợ điện lạnh qua kiểm tra vệ sinh và nạp ga.',
  },
  {
    keywords: ['bao giờ thợ', 'tiến độ', 'chưa thấy'],
    answer:
      'Bạn có thể kiểm tra trực tiếp tiến độ tại tab "Lịch sử báo hỏng". Thường thợ sẽ sắp xếp xử lý vào 17:00 - 18:30 hàng ngày.',
  },
  {
    keywords: ['bảo dưỡng', 'vệ sinh định kỳ'],
    answer:
      'Tòa nhà bảo dưỡng điều hòa định kỳ 6 tháng/lần (tháng 4 và tháng 10). BQL sẽ gửi thông báo trước.',
  },
  {
    keywords: ['thêm xe', 'đăng ký xe'],
    answer:
      'Từ xe thứ 3 trở đi phí gửi là 100.000đ/xe/tháng. Bạn vào mục "Quản lý xe" để đăng ký nhé.',
  },
  {
    keywords: ['mất thẻ', 'thẻ từ', 'làm lại thẻ'],
    answer:
      'Bạn xuống phòng Quản lý tại tầng 1 (08:00 - 18:00) để báo hủy thẻ cũ và làm thẻ mới. Phí cấp lại là 50.000đ/thẻ.',
  },
  {
    keywords: ['mạng', 'wifi', 'chậm', 'chập chờn'],
    answer:
      'Bạn thử tắt mở lại Wifi hoặc rút nguồn modem ngoài hành lang cắm lại nhé. Nếu không được, bạn bấm "Báo sự cố mạng" trên app.',
  },
  {
    keywords: ['rác', 'vứt rác', 'đổ rác'],
    answer:
      'Rác sinh hoạt bạn mang xuống thùng rác lớn góc nhà xe tầng 1. Xe môi trường gom từ 19:00 - 20:00. Xin đừng để ngoài hành lang.',
  },
  {
    keywords: ['ồn', 'hàng xóm', 'mở nhạc'],
    answer:
      'Bạn có thể chọn "Phản ánh nội quy" trên app để cảnh báo ẩn danh, hoặc gọi hotline bảo vệ trực đêm.',
  },
  {
    keywords: ['khách', 'qua đêm', 'người thân'],
    answer:
      'Bạn vui lòng vào mục "Đăng ký khách lưu trú" trên app và tải ảnh CCCD của khách trước 21h nhé.',
  },
  {
    keywords: ['thú cưng', 'chó', 'mèo'],
    answer:
      'Nhà trọ cho phép nuôi thú cưng nhỏ dưới 5kg (đã tiêm phòng), giữ vệ sinh và không gây ồn sau 22h.',
  },
  {
    keywords: ['ban đêm', 'giờ giấc', 'về muộn'],
    answer:
      'Tòa nhà mở cửa tự do 24/24. Cổng ngoài tự chốt sau 23h, bạn dùng vân tay/thẻ từ mở và chú ý dắt xe nhẹ nhàng nhé.',
  },
  {
    keywords: ['hết hạn hợp đồng', 'xem hợp đồng'],
    answer: 'Bạn xem ngày hết hạn hợp đồng tại mục "Thông tin hợp đồng" trên ứng dụng.',
  },
  {
    keywords: ['gia hạn hợp đồng', 'ký tiếp'],
    answer:
      'Bạn vào mục "Hợp đồng" và bấm "Yêu cầu gia hạn" trước khi hết hạn 15 ngày nhé.',
  },
  {
    keywords: ['trả phòng', 'hoàn cọc', 'tiền cọc'],
    answer:
      'Bạn cần bấm "Thông báo trả phòng" trên app trước tối thiểu 30 ngày. Quản lý sẽ kiểm tra và hoàn 100% cọc nếu phòng nguyên vẹn.',
  },
];

export class ChatService {
  private getApiKey(): string | null {
    const key = process.env.GEMINI_API_KEY?.trim();
    if (!key || key === 'YOUR_GEMINI_API_KEY_HERE') {
      return null;
    }
    return key;
  }

  private getModelCandidates(): string[] {
    const configured = process.env.GEMINI_MODEL?.trim();
    const list = configured ? [configured, ...DEFAULT_GEMINI_MODELS] : DEFAULT_GEMINI_MODELS;
    return Array.from(new Set(list));
  }

  private isFatalKeyError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return (
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid') ||
      message.includes('API key expired') ||
      message.includes('[401 ')
    );
  }

  private buildSystemInstruction(userContext?: ChatUserContext): string {
    const contextLines: string[] = [];
    if (userContext?.name) contextLines.push(`- Họ tên: ${userContext.name}`);
    if (userContext?.phone) contextLines.push(`- Số điện thoại: ${userContext.phone}`);
    if (userContext?.roomNumber && userContext.roomNumber !== 'Unknown') {
      contextLines.push(`- Số phòng hiện tại: ${userContext.roomNumber}`);
    }
    if (userContext?.role) contextLines.push(`- Vai trò: ${userContext.role}`);

    const userSection =
      contextLines.length > 0
        ? `\nThông tin cư dân đang đăng nhập:\n${contextLines.join('\n')}\nKhi cư dân hỏi về hóa đơn hoặc báo hỏng phòng của chính họ mà chưa ghi lại SĐT/số phòng, hãy dùng thông tin trên để gọi tool.`
        : '';

    return `Bạn là SmartHost — Trợ lý ảo AI thân thiện, chuyên nghiệp của hệ thống quản lý nhà trọ.
Hãy trả lời bằng tiếng Việt rõ ràng, ngắn gọn, lịch sự và chính xác.
- Khi người dùng hỏi về phòng trống, hãy gọi tool \`checkAvailableRooms\`.
- Khi người dùng hỏi về hóa đơn, công nợ, tiền phòng của họ, hãy gọi tool \`getInvoiceStatus\`.
- Khi người dùng muốn báo hỏng thiết bị/sự cố kèm số phòng & SĐT (hoặc thông tin người dùng đã đăng nhập), hãy gọi tool \`createIssueReport\`. Nếu thiếu số phòng hoặc SĐT để tạo báo cáo trực tiếp, hãy hỏi bổ sung hoặc hướng dẫn vào mục "Báo hỏng / Sự cố" trên ứng dụng.
- Khi người dùng hỏi về nội quy, giờ giấc, quy định chung, có thể gọi \`getRentalRules\` và kết hợp kiến thức bên dưới.
- Không bao giờ tự bịa số liệu phòng trống hoặc số tiền hóa đơn nếu tool không trả về.
${userSection}
${qaKnowledgeBase}`;
  }

  private normalizeHistory(history: ChatHistoryItem[] = []): Content[] {
    const normalized: Content[] = [];

    for (const item of history) {
      const rawText =
        typeof item.text === 'string'
          ? item.text.trim()
          : item.parts?.map((p) => p.text ?? '').join('').trim() ?? '';
      if (!rawText) continue;

      const role: 'user' | 'model' =
        item.role === 'user' ? 'user' : 'model';

      if (normalized.length === 0 && role === 'model') {
        // Gemini chat history must start with a 'user' turn
        continue;
      }

      const last = normalized[normalized.length - 1];
      if (last && last.role === role) {
        const prevPart = last.parts[0];
        if (prevPart && 'text' in prevPart && typeof prevPart.text === 'string') {
          prevPart.text = `${prevPart.text}\n${rawText}`;
        }
      } else {
        normalized.push({ role, parts: [{ text: rawText }] });
      }
    }

    // Ensure history ends on 'model' so the upcoming sendMessage('user') alternates cleanly
    while (normalized.length > 0 && normalized[normalized.length - 1]?.role === 'user') {
      normalized.pop();
    }

    // Keep recent context bounded
    return normalized.slice(-20);
  }

  // Hàm thực thi local khi AI (hoặc fallback) gọi tool
  async executeTool(
    name: string,
    args: Record<string, any>,
    userContext?: ChatUserContext
  ): Promise<Record<string, any>> {
    try {
      switch (name) {
        case 'checkAvailableRooms': {
          const rawMax = args?.maxPrice;
          let maxPrice: number | undefined;
          if (typeof rawMax === 'number' && Number.isFinite(rawMax) && rawMax > 0) {
            maxPrice = rawMax < 1000 ? rawMax * 1_000_000 : rawMax;
          }

          const whereClause: { status: 'AVAILABLE'; price?: { lte: number } } = {
            status: 'AVAILABLE',
          };
          if (maxPrice !== undefined) {
            whereClause.price = { lte: maxPrice };
          }

          const rooms = await prisma.room.findMany({
            where: whereClause,
            orderBy: { price: 'asc' },
            take: 10,
          });
          return {
            rooms: rooms.map((r) => ({
              roomNumber: r.roomNumber,
              price: r.price,
              area: r.area,
              description: r.description,
            })),
          };
        }

        case 'getInvoiceStatus': {
          const tenantPhone =
            (typeof args?.tenantPhone === 'string' && args.tenantPhone.trim()) ||
            userContext?.phone?.trim();

          const user = tenantPhone
            ? await prisma.user.findUnique({
                where: { phone: tenantPhone },
                include: { invoices: { take: 5, orderBy: { createdAt: 'desc' } } },
              })
            : userContext?.id
              ? await prisma.user.findUnique({
                  where: { id: userContext.id },
                  include: { invoices: { take: 5, orderBy: { createdAt: 'desc' } } },
                })
              : null;

          if (!user) {
            return { message: 'Không tìm thấy người dùng với số điện thoại này.' };
          }
          return {
            fullName: user.fullName,
            walletBalance: user.walletBalance,
            invoices: user.invoices.map((i) => ({
              title: i.title,
              amount: i.amount,
              status: i.status,
              dueDate: i.dueDate,
            })),
          };
        }

        case 'createIssueReport': {
          const roomNumber =
            (typeof args?.roomNumber === 'string' && args.roomNumber.trim()) ||
            (userContext?.roomNumber && userContext.roomNumber !== 'Unknown'
              ? userContext.roomNumber.trim()
              : '');
          const tenantPhone =
            (typeof args?.tenantPhone === 'string' && args.tenantPhone.trim()) ||
            userContext?.phone?.trim() ||
            '';
          const description =
            typeof args?.description === 'string' ? args.description.trim() : '';

          if (!roomNumber || !description || (!tenantPhone && !userContext?.id)) {
            return {
              message:
                'Vui lòng cung cấp đầy đủ số phòng, số điện thoại và mô tả sự cố để tạo báo cáo.',
            };
          }

          const user = tenantPhone
            ? await prisma.user.findUnique({ where: { phone: tenantPhone } })
            : userContext?.id
              ? await prisma.user.findUnique({ where: { id: userContext.id } })
              : null;
          const room = await prisma.room.findFirst({
            where: {
              roomNumber,
              ...(user?.managedById ? { landlordId: user.managedById } : {}),
            },
          });

          if (!user || !room) {
            return { message: 'Thông tin số điện thoại hoặc số phòng không chính xác.' };
          }

          const report = await prisma.issueReport.create({
            data: {
              title: `Sự cố phòng ${roomNumber}`,
              description,
              userId: user.id,
              roomId: room.id,
              landlordId: room.landlordId,
            },
          });
          return {
            message: 'Đã ghi nhận sự cố thành công!',
            reportId: report.id,
            roomNumber: room.roomNumber,
          };
        }

        case 'getRentalRules': {
          return {
            rules:
              '1. Giờ giấc tự do 24/24, cổng ngoài tự chốt sau 23h (mở bằng vân tay/thẻ từ).\n2. Vứt rác đúng nơi quy định tại góc nhà xe tầng 1 (xe gom 19:00 - 20:00).\n3. Không gây ồn ào sau 22h đêm.\n4. Thanh toán tiền nhà từ ngày 01 đến hết ngày 05 hàng tháng.',
          };
        }

        default:
          return { error: 'Tool not found' };
      }
    } catch (error) {
      console.error(`Tool execution error (${name}):`, error);
      return {
        error: 'Hiện không thể truy vấn dữ liệu hệ thống. Vui lòng thử lại sau.',
      };
    }
  }

  private async tryGeminiWithModel(
    apiKey: string,
    modelName: string,
    message: string,
    history: ChatHistoryItem[],
    userContext?: ChatUserContext
  ): Promise<ChatReply> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: this.buildSystemInstruction(userContext),
      tools,
    });

    const contents: Content[] = [
      ...this.normalizeHistory(history),
      { role: 'user', parts: [{ text: message }] },
    ];

    let result = await model.generateContent(
      { contents },
      { timeout: GEMINI_TIMEOUT_MS }
    );
    let iterations = 0;

    while (iterations < 5) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) break;

      const modelContent = result.response.candidates?.[0]?.content;
      if (modelContent) {
        contents.push(modelContent);
      } else {
        contents.push({
          role: 'model',
          parts: calls.map((call) => ({ functionCall: call })),
        });
      }

      const functionResponses: Part[] = [];
      for (const call of calls) {
        const args =
          call.args && typeof call.args === 'object'
            ? (call.args as Record<string, any>)
            : {};
        const toolOutput = await this.executeTool(call.name, args, userContext);
        functionResponses.push({
          functionResponse: {
            name: call.name,
            response: toolOutput,
          },
        });
      }

      // Gemini 3.x models require 'user' role (not 'function') for functionResponse turns
      contents.push({
        role: 'user',
        parts: functionResponses,
      });

      result = await model.generateContent(
        { contents },
        { timeout: GEMINI_TIMEOUT_MS }
      );
      iterations++;
    }

    const replyText = result.response.text()?.trim();
    if (!replyText) {
      throw new Error(`Empty response from ${modelName}`);
    }

    return {
      text: replyText,
      source: 'gemini',
      model: modelName,
    };
  }

  // Cơ chế dự phòng theo form / từ khóa có sẵn khi Gemini không chạy được
  async processFallbackChat(
    message: string,
    userContext?: ChatUserContext
  ): Promise<ChatReply> {
    const text = message.toLowerCase();

    // 1. Tra cứu phòng trống (có hỗ trợ lọc giá kiểu "dưới 3 triệu" hoặc "dưới 3000000")
    if (text.includes('phòng trống') || text.includes('phòng nào trống')) {
      let maxPrice: number | null = null;
      const millionMatch = text.match(/dưới\s*(\d+(?:[.,]\d+)?)\s*(?:tr|triệu)/i);
      const rawMatch = text.match(/dưới\s*(\d{6,9})/i);
      if (millionMatch?.[1]) {
        maxPrice = parseFloat(millionMatch[1].replace(',', '.')) * 1_000_000;
      } else if (rawMatch?.[1]) {
        maxPrice = parseInt(rawMatch[1], 10);
      }

      const toolResult = await this.executeTool(
        'checkAvailableRooms',
        { maxPrice },
        userContext
      );
      if (Array.isArray(toolResult.rooms) && toolResult.rooms.length > 0) {
        const roomList = toolResult.rooms
          .map(
            (r: { roomNumber: string; price: number }) =>
              `Phòng ${r.roomNumber} (${Number(r.price).toLocaleString('vi-VN')}đ)`
          )
          .join(', ');
        return {
          text: `Hiện tại chúng tôi đang còn trống các phòng: ${roomList}.`,
          source: 'fallback',
        };
      }
      if (toolResult.error) {
        return { text: String(toolResult.error), source: 'fallback' };
      }
      return { text: 'Hiện tại đã hết phòng trống phù hợp.', source: 'fallback' };
    }

    // 2. Nội quy / quy định chung
    if (text.includes('nội quy') || text.includes('quy định chung')) {
      const toolResult = await this.executeTool('getRentalRules', {}, userContext);
      return { text: String(toolResult.rules), source: 'fallback' };
    }

    // 3. Tra cứu hóa đơn nếu có SĐT hoặc yêu cầu tra cứu nợ trực tiếp
    const phoneMatch = message.match(/\b(0\d{8,10})\b/);
    if (
      (text.includes('nợ') || text.includes('hóa đơn') || text.includes('tiền phòng')) &&
      (phoneMatch?.[1] || text.includes('nợ bao nhiêu') || text.includes('tra cứu'))
    ) {
      const phone = phoneMatch?.[1] || userContext?.phone;
      if (phone || userContext?.id) {
        const toolResult = await this.executeTool(
          'getInvoiceStatus',
          { tenantPhone: phone ?? '' },
          userContext
        );
        if (Array.isArray(toolResult.invoices)) {
          if (toolResult.invoices.length === 0) {
            return { text: 'Bạn hiện chưa có hóa đơn nào trên hệ thống.', source: 'fallback' };
          }
          const summary = toolResult.invoices
            .slice(0, 3)
            .map(
              (inv: { title: string; amount: number; status: string }) =>
                `- ${inv.title}: ${Number(inv.amount).toLocaleString('vi-VN')}đ (${inv.status})`
            )
            .join('\n');
          return { text: `Thông tin hóa đơn gần nhất của bạn:\n${summary}`, source: 'fallback' };
        }
        if (toolResult.message) {
          return { text: String(toolResult.message), source: 'fallback' };
        }
      }
    }

    // 4. Báo hỏng sự cố nếu có đủ số phòng & SĐT (hoặc thông tin đăng nhập)
    const roomMatch = message.match(/phòng\s*(\d+[a-zA-Z]?)/i);
    if (
      (text.includes('báo hỏng') || text.includes('sự cố') || text.includes('hỏng')) &&
      roomMatch?.[1] &&
      (phoneMatch?.[1] || userContext?.phone || userContext?.id)
    ) {
      const toolResult = await this.executeTool(
        'createIssueReport',
        {
          roomNumber: roomMatch[1],
          description: message.trim(),
          tenantPhone: phoneMatch?.[1] || userContext?.phone || '',
        },
        userContext
      );
      if (toolResult.reportId) {
        return {
          text: `Đã ghi nhận báo cáo sự cố cho phòng ${roomMatch[1]} thành công! Kỹ thuật viên sẽ kiểm tra và hỗ trợ sớm nhất.`,
          source: 'fallback',
        };
      }
    }

    // 5. Keyword mapping cho bộ 20 Q&A form từ trước
    let bestMatch: string | null = null;
    let maxMatches = 0;

    for (const qa of qaMap) {
      let matches = 0;
      for (const keyword of qa.keywords) {
        if (text.includes(keyword)) {
          matches++;
        }
      }
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = qa.answer;
      }
    }

    if (bestMatch) {
      return { text: bestMatch, source: 'fallback' };
    }

    // Default fallback
    return {
      text: 'Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn có thể hỏi về các chủ đề như: giá phòng, phòng trống, tiền điện nước, đóng tiền phòng, báo hỏng thiết bị, hoặc wifi...',
      source: 'fallback',
    };
  }

  async processChat(
    message: string,
    history: ChatHistoryItem[] = [],
    userContext?: ChatUserContext
  ): Promise<ChatReply> {
    const apiKey = this.getApiKey();

    if (apiKey) {
      const models = this.getModelCandidates();
      for (const modelName of models) {
        try {
          return await this.tryGeminiWithModel(
            apiKey,
            modelName,
            message,
            history,
            userContext
          );
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          console.warn(`Gemini model "${modelName}" failed, trying fallback:`, errMsg);
          if (this.isFatalKeyError(error)) {
            break;
          }
        }
      }
    }

    return this.processFallbackChat(message, userContext);
  }
}
