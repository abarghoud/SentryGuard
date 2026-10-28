Pod::Spec.new do |s|
  s.name           = 'FoldDivision'
  s.version        = '1.0.0'
  s.summary        = 'Reports the fold of a foldable iPhone to JavaScript'
  s.description    = 'Reads the division reserved regions of the key window so layouts can keep content off the fold'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
