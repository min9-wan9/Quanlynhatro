import { GoogleGenerativeAI, FunctionDeclaration, Schema, SchemaType } from '@google/generative-ai';
import prisma from '../../config/db';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// 1. Định nghĩa các tools (Function Calling)
const checkAvailableRoomsDeclaration: FunctionDeclaration = {
  name: 'checkAvailableRooms',
  description: 'Tra cứu các phòng đang trống dựa trên khoảng giá',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      maxPrice: {
        type: SchemaType.NUMBER,
        description: 'Giá phòng tối đa mà khách có thể thuê',
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
      tenantPhone: { type: SchemaType.STRING, description: 'Số điện thoại của người thuê' },
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
      roomNumber: { type: SchemaType.STRING, description: 'Số phòng bị sự cố' },
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

const tools = [{
  functionDeclarations: [
    checkAvailableRoomsDeclaration,
    getInvoiceStatusDeclaration,
    createIssueReportDeclaration,
    getRentalRulesDeclaration
  ]
}];

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

export class ChatService {
  
  // Hàm thực thi local khi AI gọi tool
  async executeTool(name: string, args: any) {
    switch (name) {
      case 'checkAvailableRooms': {
        const { maxPrice } = args;
        const whereClause: any = { status: 'AVAILABLE' };
        if (maxPrice) whereClause.price = { lte: maxPrice };
        
        const rooms = await prisma.room.findMany({ where: whereClause, take: 5 });
        return { rooms: rooms.map(r => ({ roomNumber: r.roomNumber, price: r.price, area: r.area })) };
      }
      case 'getInvoiceStatus': {
        const { tenantPhone } = args;
        const user = await prisma.user.findUnique({ where: { phone: tenantPhone }, include: { invoices: { take: 3, orderBy: { createdAt: 'desc' } } } });
        if (!user) return { message: 'Không tìm thấy người dùng với số điện thoại này.' };
        return { invoices: user.invoices.map(i => ({ title: i.title, amount: i.amount, status: i.status, dueDate: i.dueDate })) };
      }
      case 'createIssueReport': {
        const { roomNumber, description, tenantPhone } = args;
        const user = await prisma.user.findUnique({ where: { phone: tenantPhone } });
        const room = await prisma.room.findUnique({ where: { roomNumber } });
        if (!user || !room) return { message: 'Thông tin số điện thoại hoặc số phòng không chính xác.' };
        
        const report = await prisma.issueReport.create({
          data: {
            title: `Sự cố phòng ${roomNumber}`,
            description,
            userId: user.id,
            roomId: room.id,
          }
        });
        return { message: 'Đã ghi nhận sự cố thành công!', reportId: report.id };
      }
      case 'getRentalRules': {
        return {
          rules: "1. Giờ giấc tự do, mở cửa bằng vân tay.\n2. Vứt rác đúng nơi quy định trước 9h tối.\n3. Không gây ồn ào sau 10h đêm.\n4. Thanh toán tiền nhà từ ngày 1-5 hàng tháng."
        };
      }
      default:
        return { error: 'Tool not found' };
    }
  }

  async processChat(message: string, history: any[] = []) {
    const text = message.toLowerCase();
    
    // Simple keyword matching for tools
    if (text.includes('phòng trống') || text.includes('phòng nào trống')) {
      const toolResult = await this.executeTool('checkAvailableRooms', { maxPrice: null });
      if (toolResult.rooms && toolResult.rooms.length > 0) {
        return { text: `Hiện tại chúng tôi đang còn trống các phòng: ${toolResult.rooms.map((r: any) => `Phòng ${r.roomNumber} (${r.price}đ)`).join(', ')}.` };
      }
      return { text: 'Hiện tại đã hết phòng trống.' };
    }

    if (text.includes('nội quy') || text.includes('quy định chung')) {
      const toolResult = await this.executeTool('getRentalRules', {});
      return { text: (toolResult as any).rules };
    }

    // Keyword mapping for the 20 Q&A
    const qaMap = [
      { keywords: ['giá', 'phí', 'điện nước', 'tiền điện'], answer: 'Tiền điện 3.500đ/kWh, nước 20.000đ/khối (hoặc khoán 100k/người), phí dịch vụ chung 120.000đ/phòng/tháng, và miễn phí 02 xe máy tại tầng 1.' },
      { keywords: ['hạn đóng', 'ngày nào đóng', 'hạn tiền'], answer: 'Hóa đơn chốt ngày 01 hàng tháng. Thời hạn thanh toán là từ ngày 01 đến hết ngày 05 bạn nhé.' },
      { keywords: ['xem hóa đơn', 'bảng kê'], answer: 'Bạn vào mục "Hóa đơn" trên thanh menu ứng dụng để xem chi tiết tiền phòng tháng này nhé.' },
      { keywords: ['chuyển khoản', 'gạch nợ'], answer: 'Bạn mở mục "Hóa đơn" và quét mã VietQR trên màn hình. Hệ thống sẽ tự động gạch nợ sau 3-5 giây mà không cần gửi biên lai xác nhận.' },
      { keywords: ['trễ', 'muộn', 'gia hạn đóng'], answer: 'Bạn có thể vào mục "Hóa đơn", chọn "Yêu cầu gia hạn" và chọn ngày cam kết đóng nhé. Ban quản lý sẽ duyệt và không tính phí phạt.' },
      { keywords: ['vòi nước', 'hỏng', 'thiết bị', 'vệ sinh', 'bồn cầu'], answer: 'Bạn vui lòng vào mục "Báo hỏng / Sự cố" trên app, chọn danh mục tương ứng và gửi yêu cầu. Thợ sẽ liên hệ hỗ trợ bạn sớm nhất.' },
      { keywords: ['điều hòa', 'máy lạnh', 'không mát', 'chảy nước'], answer: 'Bạn gửi yêu cầu qua mục "Báo hỏng / Sự cố" nhé. Ban quản lý sẽ xếp thợ điện lạnh qua kiểm tra vệ sinh và nạp ga.' },
      { keywords: ['bao giờ thợ', 'tiến độ', 'chưa thấy'], answer: 'Bạn có thể kiểm tra trực tiếp tiến độ tại tab "Lịch sử báo hỏng". Thường thợ sẽ sắp xếp xử lý vào 17:00 - 18:30 hàng ngày.' },
      { keywords: ['bảo dưỡng', 'vệ sinh định kỳ'], answer: 'Tòa nhà bảo dưỡng điều hòa định kỳ 6 tháng/lần (tháng 4 và tháng 10). BQL sẽ gửi thông báo trước.' },
      { keywords: ['thêm xe', 'đăng ký xe'], answer: 'Từ xe thứ 3 trở đi phí gửi là 100.000đ/xe/tháng. Bạn vào mục "Quản lý xe" để đăng ký nhé.' },
      { keywords: ['mất thẻ', 'thẻ từ', 'làm lại thẻ'], answer: 'Bạn xuống phòng Quản lý tại tầng 1 (08:00 - 18:00) để báo hủy thẻ cũ và làm thẻ mới. Phí cấp lại là 50.000đ/thẻ.' },
      { keywords: ['mạng', 'wifi', 'chậm', 'chập chờn'], answer: 'Bạn thử tắt mở lại Wifi hoặc rút nguồn modem ngoài hành lang cắm lại nhé. Nếu không được, bạn bấm "Báo sự cố mạng" trên app.' },
      { keywords: ['rác', 'vứt rác', 'đổ rác'], answer: 'Rác sinh hoạt bạn mang xuống thùng rác lớn góc nhà xe tầng 1. Xe môi trường gom từ 19:00 - 20:00. Xin đừng để ngoài hành lang.' },
      { keywords: ['ồn', 'hàng xóm', 'mở nhạc'], answer: 'Bạn có thể chọn "Phản ánh nội quy" trên app để cảnh báo ẩn danh, hoặc gọi hotline bảo vệ trực đêm.' },
      { keywords: ['khách', 'qua đêm', 'người thân'], answer: 'Bạn vui lòng vào mục "Đăng ký khách lưu trú" trên app và tải ảnh CCCD của khách trước 21h nhé.' },
      { keywords: ['thú cưng', 'chó', 'mèo'], answer: 'Nhà trọ cho phép nuôi thú cưng nhỏ dưới 5kg (đã tiêm phòng), giữ vệ sinh và không gây ồn sau 22h.' },
      { keywords: ['ban đêm', 'giờ giấc', 'về muộn'], answer: 'Tòa nhà mở cửa tự do 24/24. Cổng ngoài tự chốt sau 23h, bạn dùng vân tay/thẻ từ mở và chú ý dắt xe nhẹ nhàng nhé.' },
      { keywords: ['hết hạn hợp đồng', 'xem hợp đồng'], answer: 'Bạn xem ngày hết hạn hợp đồng tại mục "Thông tin hợp đồng" trên ứng dụng.' },
      { keywords: ['gia hạn hợp đồng', 'ký tiếp'], answer: 'Bạn vào mục "Hợp đồng" và bấm "Yêu cầu gia hạn" trước khi hết hạn 15 ngày nhé.' },
      { keywords: ['trả phòng', 'hoàn cọc', 'tiền cọc'], answer: 'Bạn cần bấm "Thông báo trả phòng" trên app trước tối thiểu 30 ngày. Quản lý sẽ kiểm tra và hoàn 100% cọc nếu phòng nguyên vẹn.' }
    ];

    let bestMatch = null;
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
      return { text: bestMatch };
    }

    // Default fallback
    return {
      text: "Xin lỗi, tôi chưa hiểu rõ ý bạn. Bạn có thể hỏi về các chủ đề như: giá phòng, tiền điện nước, đóng tiền phòng, báo hỏng thiết bị, hoặc wifi...",
    };
  }
}
