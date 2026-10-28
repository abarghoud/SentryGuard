import ExpoModulesCore
import UIKit

public class FoldDivisionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("SentryGuardFoldDivision")

    AsyncFunction("getFoldDivisions") { () -> [FoldDivision] in
      guard let window = Self.keyWindow() else {
        return []
      }

      return FoldDivisionReader.readDivisions(in: window)
    }.runOnQueue(.main)
  }

  private static func keyWindow() -> UIWindow? {
    return UIApplication.shared.connectedScenes
      .compactMap { ($0 as? UIWindowScene)?.keyWindow }
      .first
  }
}

struct FoldDivision: Record {
  @Field var height: Double = 0
  @Field var width: Double = 0
  @Field var x: Double = 0
  @Field var y: Double = 0

  init() {}

  init(frame: CGRect) {
    self.height = frame.height
    self.width = frame.width
    self.x = frame.origin.x
    self.y = frame.origin.y
  }
}

enum FoldDivisionReader {
  private typealias DivisionKindFactory = @convention(c) (AnyClass, Selector) -> Unmanaged<AnyObject>
  private typealias ReservedRegionsQuery = @convention(c) (AnyObject, Selector, AnyObject, UInt) -> Unmanaged<NSArray>

  private static let divisionKindSelector = NSSelectorFromString("divisionRegionKind")
  private static let divisionKindSignature = MethodSignature(argumentTypes: ["@", ":"], returnType: "@")
  private static let frameSelector = NSSelectorFromString("frame")
  private static let includeInactiveOption: UInt = 1
  private static let reservedRegionsSelector = NSSelectorFromString("reservedRegionsOfKind:options:")
  private static let reservedRegionsSignature = MethodSignature(argumentTypes: ["@", ":", "@", "Q"], returnType: "@")

  static func readDivisions(in view: UIView) -> [FoldDivision] {
    guard let divisionKind = makeDivisionKind(),
          let method = class_getInstanceMethod(type(of: view), reservedRegionsSelector),
          reservedRegionsSignature.matches(method) else {
      return []
    }

    let query = unsafeBitCast(method_getImplementation(method), to: ReservedRegionsQuery.self)
    let regions = query(view, reservedRegionsSelector, divisionKind, includeInactiveOption).takeUnretainedValue()

    return regions.compactMap { makeFoldDivision(from: $0) }
  }

  private static func makeDivisionKind() -> AnyObject? {
    guard let kindClass = NSClassFromString("UIViewReservedRegionKind"),
          let method = class_getClassMethod(kindClass, divisionKindSelector),
          divisionKindSignature.matches(method) else {
      return nil
    }

    let factory = unsafeBitCast(method_getImplementation(method), to: DivisionKindFactory.self)

    return factory(kindClass, divisionKindSelector).takeUnretainedValue()
  }

  private static func makeFoldDivision(from region: Any) -> FoldDivision? {
    guard let region = region as? NSObject,
          region.responds(to: frameSelector),
          let frame = (region.value(forKey: "frame") as? NSValue)?.cgRectValue else {
      return nil
    }

    return FoldDivision(frame: frame)
  }
}

private struct MethodSignature {
  let argumentTypes: [String]
  let returnType: String

  func matches(_ method: Method) -> Bool {
    guard method_getNumberOfArguments(method) == argumentTypes.count,
          Self.takeType(method_copyReturnType(method)) == returnType else {
      return false
    }

    return argumentTypes.indices.allSatisfy { index in
      Self.takeType(method_copyArgumentType(method, UInt32(index))) == argumentTypes[index]
    }
  }

  private static func takeType(_ encoding: UnsafeMutablePointer<CChar>?) -> String? {
    guard let encoding else {
      return nil
    }
    defer { free(encoding) }

    return String(cString: encoding)
  }
}
