import {
    LayoutDashboard,
    Users,
    Settings,
    Calendar,
    FileText,
    Shield,
    Key,
    Truck,
    MapPin,
    Bell,
    Database,
    Printer,
    HardDrive
} from 'lucide-react';

export const USER_GUIDE_DATA = {
    admin: [
        {
            title: 'Hệ thống Quản lý Sự kiện (Admin)',
            description: 'Chào mừng Administrator. Đây là hướng dẫn chi tiết toàn bộ quyền hạn và chức năng của bạn.',
            icon: Shield,
            color: 'text-indigo-600',
            bg: 'bg-indigo-50'
        },
        {
            title: '1. Quản lý Tổng quan (Dashboard)',
            description: 'Theo dõi toàn bộ hoạt động sự kiện qua 4 giao diện: List (Danh sách), Calendar (Lịch), Timeline (Tiến độ), và Analytics (Thống kê). Sử dụng bộ lọc thông minh để tìm kiếm sự kiện theo Trạng thái, Phòng ban hoặc Địa điểm.',
            icon: LayoutDashboard,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: '2. Quản lý Người dùng (Users)',
            description: 'Truy cập "Settings > User Management". Tại đây bạn có thể: (1) Tạo tài khoản mới, (2) Phân quyền (Admin, Manager, User), (3) Gán nhân sự vào Phòng ban, (4) Reset mật khẩu hoặc Vô hiệu hóa tài khoản.',
            icon: Users,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: '3. Quản lý Hạ tầng & Vật tư',
            description: 'Cấu hình tài nguyên hệ thống: (1) Locations: Quản lý danh sách địa điểm/sảnh. (2) Departments: Quản lý phòng ban và màu sắc đại diện. (3) Resources: Quản lý kho thiết bị (Bàn, ghế, âm thanh) để người dùng đăng ký.',
            icon: MapPin,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        },
        {
            title: '4. Cấu hình Hệ thống (System)',
            description: 'Các cài đặt nâng cao: (1) Notifications: Cấu hình kênh thông báo (Email/App). (2) Audit Logs: Tra cứu lịch sử thao tác để bảo mật. (3) Data Retention: Thiết lập chính sách lưu trữ và xóa dữ liệu tự động.',
            icon: Settings,
            color: 'text-slate-600',
            bg: 'bg-slate-50'
        },
        {
            title: '5. Phê duyệt & In ấn',
            description: 'Quy trình xử lý sự kiện: (1) Nhận thông báo yêu cầu mới. (2) Xem chi tiết và nhấn "Approve" hoặc "Reject". (3) Sử dụng "Print Portal" để xuất các biểu mẫu (Form 01-15) cho công tác thi công và nghiệm thu.',
            icon: Printer,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
        }
    ],
    manager: [
        {
            title: 'Chào mừng Manager',
            description: 'Vai trò của bạn tập trung vào điều phối và giám sát vận hành sự kiện.',
            icon: Key,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50'
        },
        {
            title: 'Phê duyệt Sự kiện',
            description: 'Kiểm tra các yêu cầu đăng ký từ User. Đảm bảo thông tin hợp lệ về thời gian và địa điểm trước khi phê duyệt.',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Điều phối Logistics',
            description: 'Sử dụng màn hình "Logistics Timeline" để theo dõi các giai đoạn: Setup (Dàn dựng), Live (Đang diễn ra) và Cleanup (Dọn dẹp).',
            icon: Truck,
            color: 'text-orange-600',
            bg: 'bg-orange-50'
        }
    ],
    user: [
        {
            title: 'Chào mừng bạn',
            description: 'Hệ thống giúp bạn đăng ký và theo dõi sự kiện một cách dễ dàng.',
            icon: LayoutDashboard,
            color: 'text-primary-600',
            bg: 'bg-primary-50'
        },
        {
            title: 'Đăng ký Sự kiện',
            description: 'Nhấn "Register Event" để tạo yêu cầu mới. Hãy điền đầy đủ thông tin về Thời gian, Địa điểm và Thiết bị cần thiết.',
            icon: Calendar,
            color: 'text-blue-600',
            bg: 'bg-blue-50'
        },
        {
            title: 'Theo dõi Trạng thái',
            description: 'Theo dõi sự kiện của bạn tại Dashboard. Bạn sẽ nhận được thông báo khi yêu cầu được Phê duyệt hoặc Từ chối.',
            icon: Bell,
            color: 'text-amber-600',
            bg: 'bg-amber-50'
        }
    ]
};
