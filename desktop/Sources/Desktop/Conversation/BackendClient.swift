import Foundation

struct BackendClient: Sendable {
    let base = URL(string: "http://127.0.0.1:4111/joe-api")!
    func request(_ path: String, body: [String: Any]? = nil) throws -> URLRequest {
        var request = URLRequest(url: base.appending(path: path))
        request.timeoutInterval = 180
        if let body {
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        }
        return request
    }
    func data(_ path: String, body: [String: Any]? = nil) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request(path, body: body))
        try Self.validate(response, data: data)
        return data
    }
    func json(_ path: String, body: [String: Any]? = nil) async throws -> [String: Any] {
        let result = try await data(path, body: body)
        guard let object = try JSONSerialization.jsonObject(with: result) as? [String: Any] else {
            throw CocoaError(.coderReadCorrupt)
        }
        return object
    }
    func upload(_ path: String, session: String, name: String, field: String, mime: String, data: Data) async throws -> [String: Any] {
        let boundary = UUID().uuidString
        var request = URLRequest(url: base.appending(path: path))
        request.timeoutInterval = 100
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        var body = Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"sessionId\"\r\n\r\n\(session)\r\n".utf8)
        let safeName = name.filter { $0 != "\"" && $0 != "\r" && $0 != "\n" }
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(field)\"; filename=\"\(safeName)\"\r\nContent-Type: \(mime)\r\n\r\n".utf8))
        body.append(data); body.append(Data("\r\n--\(boundary)--\r\n".utf8)); request.httpBody = body
        let (result, response) = try await URLSession.shared.data(for: request)
        try Self.validate(response, data: result)
        return try JSONSerialization.jsonObject(with: result) as? [String: Any] ?? [:]
    }
    static func validate(_ response: URLResponse, data: Data = Data()) throws {
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            throw NSError(domain: "Backend", code: (response as? HTTPURLResponse)?.statusCode ?? 0,
                          userInfo: [NSLocalizedDescriptionKey: json?["error"] as? String ?? "服务连接失败，请重试"])
        }
    }
}
